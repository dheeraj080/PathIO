package com.pt.pathio.service;

import com.pt.pathio.auth.UserPrincipal;
import com.pt.pathio.auth.entity.Provider;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.repository.UserRepository;
import com.pt.pathio.dto.AnalyticsOverviewResponse;
import com.pt.pathio.dto.ShortenUrlRequest;
import com.pt.pathio.dto.ShortenUrlResponse;
import com.pt.pathio.dto.UrlAnalyticsResponse;
import com.pt.pathio.dto.UserUrlResponse;
import com.pt.pathio.entity.UrlEntity;
import com.pt.pathio.exception.ResourceNotFoundException;
import com.pt.pathio.repository.UrlRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class UrlOwnershipAndAnalyticsTest {

    @Autowired
    private UrlShortenerService urlShortenerService;

    @Autowired
    private UrlAnalyticsService urlAnalyticsService;

    @Autowired
    private UrlRepository urlRepository;

    @Autowired
    private UserRepository userRepository;

    private User testUser1;
    private User testUser2;

    @BeforeEach
    void setUp() {
        testUser1 = userRepository.save(User.builder()
                .email("user1_" + UUID.randomUUID() + "@example.com")
                .name("User One")
                .password("Pass123!")
                .provider(Provider.LOCAL)
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());

        testUser2 = userRepository.save(User.builder()
                .email("user2_" + UUID.randomUUID() + "@example.com")
                .name("User Two")
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

    @Test
    @DisplayName("Anonymous URL shortening is rejected (Phase 3: OAuth-only)")
    void testAnonymousUrlShorteningRejected() {
        SecurityContextHolder.clearContext();

        ShortenUrlRequest request = new ShortenUrlRequest("https://example.com/anonymous-page");

        assertThatThrownBy(() -> urlShortenerService.shortenUrl(request))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Authenticated URL shortening links URL to the current SecurityContext principal")
    void testAuthenticatedUrlShortening() {
        UserPrincipal principal = new UserPrincipal(testUser1.getId(), testUser1.getEmail());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, Collections.emptyList())
        );

        ShortenUrlRequest request = new ShortenUrlRequest("https://example.com/user1-page");
        ShortenUrlResponse response = urlShortenerService.shortenUrl(request);

        String shortCode = response.shortUrl().substring(response.shortUrl().lastIndexOf('/') + 1);
        UrlEntity entity = urlRepository.findByShortCode(shortCode).orElseThrow();

        assertThat(entity.getUser()).isNotNull();
        assertThat(entity.getUser().getId()).isEqualTo(testUser1.getId());
    }

    @Test
    @DisplayName("getUserUrls returns paginated URLs strictly owned by the requested user")
    void testGetUserUrlsIsolation() {
        // Create 2 URLs for user 1
        UserPrincipal principal1 = new UserPrincipal(testUser1.getId(), testUser1.getEmail());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal1, null, Collections.emptyList())
        );
        urlShortenerService.shortenUrl(new ShortenUrlRequest("https://example.com/u1-link1"));
        urlShortenerService.shortenUrl(new ShortenUrlRequest("https://example.com/u1-link2"));

        // Create 1 URL for user 2
        UserPrincipal principal2 = new UserPrincipal(testUser2.getId(), testUser2.getEmail());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal2, null, Collections.emptyList())
        );
        urlShortenerService.shortenUrl(new ShortenUrlRequest("https://example.com/u2-link1"));

        // Verify User 1 sees exactly their 2 URLs
        Page<UserUrlResponse> user1Urls = urlShortenerService.getUserUrls(testUser1.getId(), PageRequest.of(0, 10));
        assertThat(user1Urls.getTotalElements()).isEqualTo(2);
        assertThat(user1Urls.getContent()).allMatch(u -> u.longUrl().startsWith("https://example.com/u1-"));

        // Verify User 2 sees exactly their 1 URL
        Page<UserUrlResponse> user2Urls = urlShortenerService.getUserUrls(testUser2.getId(), PageRequest.of(0, 10));
        assertThat(user2Urls.getTotalElements()).isEqualTo(1);
        assertThat(user2Urls.getContent().get(0).longUrl()).isEqualTo("https://example.com/u2-link1");
    }

    @Test
    @DisplayName("Analytics queries are strictly owner-scoped and protect anonymous or other users' URLs")
    void testAnalyticsOwnershipEnforcement() {
        // User 1 creates a URL
        UserPrincipal principal1 = new UserPrincipal(testUser1.getId(), testUser1.getEmail());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal1, null, Collections.emptyList())
        );
        ShortenUrlResponse res1 = urlShortenerService.shortenUrl(new ShortenUrlRequest("https://example.com/u1-stats"));
        String shortCode1 = res1.shortUrl().substring(res1.shortUrl().lastIndexOf('/') + 1);

        // Legacy anonymous row (no longer creatable via the API) — inserted directly to prove
        // analytics stays owner-scoped even for unowned links.
        UrlEntity anonEntity = UrlEntity.builder()
                .id(System.nanoTime())
                .longUrl("https://example.com/anon-stats")
                .shortCode("anonstats" + UUID.randomUUID().toString().replace("-", "").substring(0, 8))
                .clickCount(0L)
                .user(null)
                .build();
        urlRepository.save(anonEntity);
        String anonCode = anonEntity.getShortCode();

        // 1. Owner can query analytics
        UrlAnalyticsResponse stats = urlAnalyticsService.getUrlAnalytics(shortCode1, testUser1.getId());
        assertThat(stats.shortCode()).isEqualTo(shortCode1);
        assertThat(stats.totalClicks()).isEqualTo(0);

        // 2. User 2 querying User 1's URL gets ResourceNotFoundException (no information leakage)
        assertThatThrownBy(() -> urlAnalyticsService.getUrlAnalytics(shortCode1, testUser2.getId()))
                .isInstanceOf(ResourceNotFoundException.class);

        // 3. User querying anonymous URL gets ResourceNotFoundException
        assertThatThrownBy(() -> urlAnalyticsService.getUrlAnalytics(anonCode, testUser1.getId()))
                .isInstanceOf(ResourceNotFoundException.class);

        // 4. Overview aggregates correct totals
        AnalyticsOverviewResponse overview1 = urlAnalyticsService.getOverview(testUser1.getId());
        assertThat(overview1.totalUrls()).isEqualTo(1);
        assertThat(overview1.totalClicks()).isEqualTo(0);
    }
}
