package com.pt.pathio.service;

import com.pt.pathio.auth.UserPrincipal;
import com.pt.pathio.auth.entity.Provider;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.repository.UserRepository;
import com.pt.pathio.dto.ShortenUrlRequest;
import com.pt.pathio.dto.ShortenUrlResponse;
import com.pt.pathio.dto.UrlAnalyticsResponse;
import com.pt.pathio.entity.ClickBreakdownEntity;
import com.pt.pathio.entity.ClickRollupEntity;
import com.pt.pathio.listener.UrlAnalyticsListener;
import com.pt.pathio.repository.ClickBreakdownRepository;
import com.pt.pathio.repository.ClickRollupRepository;
import com.pt.pathio.repository.UrlRepository;
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

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * DB-01 regression: click analytics must be bound to the immutable URL record id, not the reusable
 * short code. When an owner deletes a URL and another user re-registers the same alias, the new
 * owner must see zero history/breakdown/unique counts and the previous rows must be gone
 * (FK cascade on urls.id + Redis HLL/pending purge).
 *
 * @SpringBootTest: requires PostgreSQL and Redis; blocked on TEST-01 in this workspace, runs in CI.
 */
@SpringBootTest
@Transactional
@ActiveProfiles("test")
class UrlAnalyticsAliasReuseTest {

    @Autowired
    private UrlShortenerService urlShortenerService;

    @Autowired
    private UrlAnalyticsService urlAnalyticsService;

    @Autowired
    private UrlAnalyticsListener urlAnalyticsListener;

    @Autowired
    private UrlRepository urlRepository;

    @Autowired
    private ClickRollupRepository clickRollupRepository;

    @Autowired
    private ClickBreakdownRepository clickBreakdownRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private jakarta.persistence.EntityManager entityManager;

    private User userA;
    private User userB;

    @BeforeEach
    void setUp() {
        userA = userRepository.save(User.builder()
                .email("alias_a_" + UUID.randomUUID() + "@example.com")
                .name("Alias Owner A")
                .password("Pass123!")
                .provider(Provider.LOCAL)
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());

        userB = userRepository.save(User.builder()
                .email("alias_b_" + UUID.randomUUID() + "@example.com")
                .name("Alias Owner B")
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
    }

    private void authenticate(User user) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(
                        new UserPrincipal(user.getId(), user.getEmail()), null, Collections.emptyList())
        );
    }

    private String shortenAlias(User user, String alias) {
        authenticate(user);
        ShortenUrlResponse res = urlShortenerService.shortenUrl(
                new ShortenUrlRequest("https://example.com/" + UUID.randomUUID(), alias));
        return res.shortUrl().substring(res.shortUrl().lastIndexOf('/') + 1);
    }

    @Test
    @DisplayName("DB-01: reusing a deleted alias never surfaces the previous owner's analytics")
    void aliasReuseDoesNotLeakAnalytics() {
        String alias = "shared" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        // --- User A claims the alias and generates analytics (buffered in Redis, then flushed) ---
        shortenAlias(userA, alias);
        redisTemplate.opsForHash().increment(UrlAnalyticsListener.PENDING_HASH, alias, 2);
        redisTemplate.opsForHash().increment("url:pending_daily:" + today, alias, 2);
        redisTemplate.opsForHash().increment("url:pending_breakdown:" + today, alias + "|REFERRER|news.example.com", 2);
        redisTemplate.opsForHash().increment("url:pending_breakdown:" + today, alias + "|DEVICE|desktop", 2);
        // Register the pending day in the SET index the flush job reads instead of KEYS (RED-02).
        redisTemplate.opsForSet().add(UrlAnalyticsListener.PENDING_DAILY_INDEX, today.toString());
        redisTemplate.opsForSet().add(UrlAnalyticsListener.PENDING_BREAKDOWN_INDEX, today.toString());
        redisTemplate.opsForHyperLogLog().add("url:unique:" + alias, "visitor-a", "visitor-b");

        urlAnalyticsListener.flushClickCountsToDb();
        entityManager.flush();
        entityManager.clear();

        long aUrlId = urlRepository.findByShortCode(alias).orElseThrow().getId();
        assertThat(urlRepository.findByShortCode(alias).orElseThrow().getClickCount()).isEqualTo(2);

        // --- User A deletes the URL: DB rows cascade (V7 FK), Redis keys purged ---
        authenticate(userA);
        urlShortenerService.deleteUrl(alias, userA.getId());
        entityManager.flush();
        entityManager.clear();

        // --- User B re-registers the exact same alias ---
        shortenAlias(userB, alias);
        Long bUrlId = urlRepository.findByShortCode(alias).orElseThrow().getId();
        assertThat(bUrlId).isNotEqualTo(aUrlId);

        LocalDate from = LocalDate.now(ZoneOffset.UTC).minusDays(6);
        List<ClickRollupEntity> rollups = clickRollupRepository.findHistory(bUrlId, from);
        List<ClickBreakdownEntity> referrers = clickBreakdownRepository.findBreakdown(
                bUrlId, UrlAnalyticsListener.DIMENSION_REFERRER, from);
        List<ClickBreakdownEntity> devices = clickBreakdownRepository.findBreakdown(
                bUrlId, UrlAnalyticsListener.DIMENSION_DEVICE, from);

        assertThat(rollups).isEmpty();
        assertThat(referrers).isEmpty();
        assertThat(devices).isEmpty();

        UrlAnalyticsResponse analytics = urlAnalyticsService.getUrlAnalytics(alias, userB.getId());
        assertThat(analytics.shortCode()).isEqualTo(alias);
        assertThat(analytics.totalClicks()).isZero();
        assertThat(analytics.uniqueClicks()).isZero();
    }
}