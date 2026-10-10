package com.pt.pathio.service;

import com.pt.pathio.auth.UserPrincipal;
import com.pt.pathio.auth.entity.Provider;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.repository.UserRepository;
import com.pt.pathio.dto.ClickBreakdownResponse;
import com.pt.pathio.dto.ClickHistoryPoint;
import com.pt.pathio.dto.ShortenUrlRequest;
import com.pt.pathio.dto.ShortenUrlResponse;
import com.pt.pathio.dto.UrlAnalyticsResponse;
import com.pt.pathio.entity.ClickRollupEntity;
import com.pt.pathio.entity.UrlEntity;
import com.pt.pathio.exception.ResourceNotFoundException;
import com.pt.pathio.listener.UrlAnalyticsListener;
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
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class UrlAnalyticsDepthTest {

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
    private UserRepository userRepository;

    @Autowired
    private StringRedisTemplate redisTemplate;

    @Autowired
    private jakarta.persistence.EntityManager entityManager;

    private User testUser1;
    private User testUser2;
    private final List<String> createdCodes = new ArrayList<>();

    @BeforeEach
    void setUp() {
        testUser1 = userRepository.save(User.builder()
                .email("an_depth1_" + UUID.randomUUID() + "@example.com")
                .name("Analytics User One")
                .password("Pass123!")
                .provider(Provider.LOCAL)
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());

        testUser2 = userRepository.save(User.builder()
                .email("an_depth2_" + UUID.randomUUID() + "@example.com")
                .name("Analytics User Two")
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
        UserPrincipal principal = new UserPrincipal(user.getId(), user.getEmail());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, Collections.emptyList())
        );
    }

    private String shortenFor(User user) {
        authenticate(user);
        ShortenUrlResponse response = urlShortenerService.shortenUrl(
                new ShortenUrlRequest("https://example.com/depth-" + UUID.randomUUID()));
        String shortCode = response.shortUrl().substring(response.shortUrl().lastIndexOf('/') + 1);
        createdCodes.add(shortCode);
        return shortCode;
    }

    @Test
    @DisplayName("Unique clicks count distinct visitors using HyperLogLog")
    void testUniqueClicks() {
        String shortCode = shortenFor(testUser1);

        // Two visits from the same visitor and one from a different visitor
        urlShortenerService.getOriginalUrl(shortCode, "203.0.113.10", "Mozilla/5.0", "https://news.example.com");
        urlShortenerService.getOriginalUrl(shortCode, "203.0.113.10", "Mozilla/5.0", "https://news.example.com");
        urlShortenerService.getOriginalUrl(shortCode, "203.0.113.99", "Mozilla/5.0", null);

        UrlAnalyticsResponse analytics = urlAnalyticsService.getUrlAnalytics(shortCode, testUser1.getId());
        assertThat(analytics.uniqueClicks()).isEqualTo(2);
    }

    @Test
    @DisplayName("Daily rollups, referrer and device breakdowns flush from Redis to PostgreSQL")
    void testFlushPopulatesHistoryAndBreakdown() {
        String shortCode = shortenFor(testUser1);
        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        redisTemplate.opsForHash().increment("url:pending_clicks", shortCode, 3);
        redisTemplate.opsForHash().increment("url:pending_daily:" + today, shortCode, 3);
        redisTemplate.opsForHash().increment("url:pending_breakdown:" + today,
                shortCode + "|REFERRER|news.example.com", 2);
        redisTemplate.opsForHash().increment("url:pending_breakdown:" + today,
                shortCode + "|DEVICE|desktop", 3);

        urlAnalyticsListener.flushClickCountsToDb();

        // Bulk JPQL update + native inserts bypass the persistence context; clear it so the
        // follow-up reads observe the flushed values (production reads happen in fresh transactions).
        entityManager.flush();
        entityManager.clear();

        // Total click count updated
        assertThat(urlRepository.findByShortCode(shortCode).orElseThrow().getClickCount()).isEqualTo(3);

        // Daily rollup persisted
        List<ClickRollupEntity> rollups = clickRollupRepository.findHistory(shortCode, today);
        assertThat(rollups).hasSize(1);
        assertThat(rollups.get(0).getClicks()).isEqualTo(3);

        // History series is zero-filled and ends with today's count
        List<ClickHistoryPoint> history = urlAnalyticsService.getClickHistory(shortCode, testUser1.getId(), 7);
        assertThat(history).hasSize(7);
        assertThat(history.get(history.size() - 1).date()).isEqualTo(today);
        assertThat(history.get(history.size() - 1).clicks()).isEqualTo(3);

        // Breakdown returns referrer + device dimensions
        ClickBreakdownResponse breakdown = urlAnalyticsService.getClickBreakdown(shortCode, testUser1.getId(), 30);
        assertThat(breakdown.referrers()).anySatisfy(d -> {
            assertThat(d.value()).isEqualTo("news.example.com");
            assertThat(d.clicks()).isEqualTo(2);
        });
        assertThat(breakdown.devices()).anySatisfy(d -> {
            assertThat(d.value()).isEqualTo("desktop");
            assertThat(d.clicks()).isEqualTo(3);
        });
    }

    @Test
    @DisplayName("History for a link with no clicks is zero-filled for the whole window")
    void testHistoryZeroFilled() {
        String shortCode = shortenFor(testUser1);

        List<ClickHistoryPoint> history = urlAnalyticsService.getClickHistory(shortCode, testUser1.getId(), 3);

        assertThat(history).hasSize(3);
        assertThat(history).allMatch(p -> p.clicks() == 0L);
    }

    @Test
    @DisplayName("History and breakdown are owner-scoped and hide other users' or anonymous links")
    void testDepthOwnershipEnforcement() {
        String shortCode = shortenFor(testUser1);

        // Legacy anonymous row (no longer creatable via the API) — inserted directly to prove
        // history/breakdown stay owner-scoped even for unowned links.
        UrlEntity anonEntity = UrlEntity.builder()
                .id(System.nanoTime())
                .longUrl("https://example.com/anon-depth")
                .shortCode("anondepth" + UUID.randomUUID().toString().replace("-", "").substring(0, 8))
                .clickCount(0L)
                .user(null)
                .build();
        urlRepository.save(anonEntity);
        String anonCode = anonEntity.getShortCode();

        assertThatThrownBy(() -> urlAnalyticsService.getClickHistory(shortCode, testUser2.getId(), 7))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> urlAnalyticsService.getClickBreakdown(shortCode, testUser2.getId(), 7))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> urlAnalyticsService.getClickHistory(anonCode, testUser1.getId(), 7))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
