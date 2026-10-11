package com.pt.pathio.analytics.app;

import com.pt.pathio.analytics.dto.ClickBreakdownResponse;
import com.pt.pathio.analytics.dto.ClickHistoryPoint;
import com.pt.pathio.analytics.dto.TopLinkResponse;
import com.pt.pathio.analytics.listener.UrlAnalyticsListener;
import com.pt.pathio.auth.api.UserPrincipal;
import com.pt.pathio.auth.domain.Provider;
import com.pt.pathio.auth.domain.User;
import com.pt.pathio.auth.persistence.UserRepository;
import com.pt.pathio.link.app.UrlShortenerService;
import com.pt.pathio.link.dto.ShortenUrlRequest;
import com.pt.pathio.link.dto.ShortenUrlResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * All-links analytics aggregation: {@link UrlAnalyticsService#getGlobalHistory},
 * {@link UrlAnalyticsService#getGlobalBreakdown} and {@link UrlAnalyticsService#getTopLinks}
 * must sum across the owner's URLs only and never leak another user's rows.
 *
 * @SpringBootTest: requires PostgreSQL and Redis; runs in CI (see UrlAnalyticsDepthTest).
 */
@SpringBootTest
@Transactional
@ActiveProfiles("test")
class UrlAnalyticsGlobalTest {

    @Autowired
    private UrlShortenerService urlShortenerService;

    @Autowired
    private UrlAnalyticsService urlAnalyticsService;

    @Autowired
    private UrlAnalyticsListener urlAnalyticsListener;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private EntityManager entityManager;

    private User userA;
    private User userB;
    private final List<String> createdCodes = new ArrayList<>();

    @BeforeEach
    void setUp() {
        userA = userRepository.save(User.builder()
                .email("an_global_a_" + UUID.randomUUID() + "@example.com")
                .name("Global Analytics User A")
                .password("Pass123!")
                .provider(Provider.LOCAL)
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());

        userB = userRepository.save(User.builder()
                .email("an_global_b_" + UUID.randomUUID() + "@example.com")
                .name("Global Analytics User B")
                .password("Pass123!")
                .provider(Provider.LOCAL)
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        for (String code : createdCodes) {
            redisTemplate.delete("url:" + code);
            redisTemplate.delete("url:unique:" + code);
        }
    }

    private void authenticate(User user) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        new UserPrincipal(user.getId(), user.getEmail()), null, Collections.emptyList())
        );
    }

    private String shortenFor(User user) {
        authenticate(user);
        ShortenUrlResponse response = urlShortenerService.shortenUrl(
                new ShortenUrlRequest("https://example.com/global-" + UUID.randomUUID()));
        String shortCode = response.shortUrl().substring(response.shortUrl().lastIndexOf('/') + 1);
        createdCodes.add(shortCode);
        return shortCode;
    }

    private void seedPendingClicks(String shortCode, long clicks, String referrer, String device) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        redisTemplate.opsForHash().increment(UrlAnalyticsListener.PENDING_HASH, shortCode, clicks);
        redisTemplate.opsForHash().increment("url:pending_daily:" + today, shortCode, clicks);
        redisTemplate.opsForHash().increment("url:pending_breakdown:" + today,
                shortCode + "|REFERRER|" + referrer, clicks);
        redisTemplate.opsForHash().increment("url:pending_breakdown:" + today,
                shortCode + "|DEVICE|" + device, clicks);
        redisTemplate.opsForSet().add(UrlAnalyticsListener.PENDING_DAILY_INDEX, today.toString());
        redisTemplate.opsForSet().add(UrlAnalyticsListener.PENDING_BREAKDOWN_INDEX, today.toString());
    }

    @Test
    @DisplayName("Global history and breakdown aggregate across the owner's links only")
    void globalSeriesCoversOwnedLinksOnly() {
        String linkA1 = shortenFor(userA);
        String linkA2 = shortenFor(userA);
        String linkB = shortenFor(userB);

        seedPendingClicks(linkA1, 3, "news.example.com", "desktop");
        seedPendingClicks(linkA2, 2, "www.google.com", "mobile");
        seedPendingClicks(linkB, 9, "hacker.example", "bot");

        urlAnalyticsListener.flushClickCountsToDb();
        entityManager.flush();
        entityManager.clear();

        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        // History: user A sees 3 + 2 on the last day; user B's rows are excluded.
        List<ClickHistoryPoint> history = urlAnalyticsService.getGlobalHistory(userA.getId(), 7);
        assertThat(history).hasSize(7);
        assertThat(history.get(history.size() - 1).date()).isEqualTo(today);
        assertThat(history.get(history.size() - 1).clicks()).isEqualTo(5);

        // Breakdown: aggregated by dimension value; the other user's totals are excluded.
        ClickBreakdownResponse breakdown = urlAnalyticsService.getGlobalBreakdown(userA.getId(), 7);
        assertThat(dimensionCount(breakdown.referrers(), "news.example.com")).isEqualTo(3);
        assertThat(dimensionCount(breakdown.referrers(), "www.google.com")).isEqualTo(2);
        assertThat(dimensionCount(breakdown.referrers(), "hacker.example")).isZero();
        assertThat(dimensionCount(breakdown.devices(), "desktop")).isEqualTo(3);
        assertThat(dimensionCount(breakdown.devices(), "mobile")).isEqualTo(2);
        assertThat(dimensionCount(breakdown.devices(), "bot")).isZero();
    }

    @Test
    @DisplayName("Top links rank the owner's URLs by persisted clicks and respect the limit")
    void topLinksRankOwnedUrls() {
        String linkA1 = shortenFor(userA);
        String linkA2 = shortenFor(userA);
        String linkB = shortenFor(userB);

        seedPendingClicks(linkA1, 7, "news.example.com", "desktop");
        seedPendingClicks(linkA2, 2, "news.example.com", "desktop");
        seedPendingClicks(linkB, 20, "news.example.com", "desktop");

        urlAnalyticsListener.flushClickCountsToDb();
        entityManager.flush();
        entityManager.clear();

        List<TopLinkResponse> top = urlAnalyticsService.getTopLinks(userA.getId(), 5);
        assertThat(top).hasSize(2);
        assertThat(top.get(0).shortCode()).isEqualTo(linkA1);
        assertThat(top.get(0).clickCount()).isEqualTo(7);
        assertThat(top.get(1).shortCode()).isEqualTo(linkA2);
        assertThat(top.get(1).clickCount()).isEqualTo(2);

        // Top links are owner-scoped and the limit is respected.
        List<TopLinkResponse> topB = urlAnalyticsService.getTopLinks(userB.getId(), 1);
        assertThat(topB).hasSize(1);
        assertThat(topB.get(0).shortCode()).isEqualTo(linkB);
        assertThat(topB.get(0).clickCount()).isEqualTo(20);
    }

    @Test
    @DisplayName("Global analytics are zero-filled and empty when the user has no clicks")
    void globalSeriesZeroFilled() {
        shortenFor(userA);

        List<ClickHistoryPoint> history = urlAnalyticsService.getGlobalHistory(userA.getId(), 3);
        assertThat(history).hasSize(3);
        assertThat(history).allMatch(p -> p.clicks() == 0L);

        ClickBreakdownResponse breakdown = urlAnalyticsService.getGlobalBreakdown(userA.getId(), 7);
        assertThat(breakdown.referrers()).isEmpty();
        assertThat(breakdown.devices()).isEmpty();

        assertThat(urlAnalyticsService.getTopLinks(userA.getId(), 5)).isEmpty();
    }

    private long dimensionCount(List<ClickBreakdownResponse.DimensionCount> counts, String value) {
        return counts.stream()
                .filter(d -> d.value().equals(value))
                .mapToLong(ClickBreakdownResponse.DimensionCount::clicks)
                .findFirst()
                .orElse(0L);
    }
}