package com.pt.pathio.service;

import com.pt.pathio.auth.UserPrincipal;
import com.pt.pathio.auth.entity.Provider;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.repository.UserRepository;
import com.pt.pathio.dto.ShortenUrlRequest;
import com.pt.pathio.dto.ShortenUrlResponse;
import com.pt.pathio.dto.UpdateUrlRequest;
import com.pt.pathio.dto.UserUrlResponse;
import com.pt.pathio.entity.UrlEntity;
import com.pt.pathio.exception.ConflictException;
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
class UrlLinkManagementTest {

    @Autowired
    private UrlShortenerService urlShortenerService;

    @Autowired
    private UrlRepository urlRepository;

    @Autowired
    private UserRepository userRepository;

    private User testUser1;
    private User testUser2;

    @BeforeEach
    void setUp() {
        testUser1 = userRepository.save(User.builder()
                .email("lm_user1_" + UUID.randomUUID() + "@example.com")
                .name("Link User One")
                .password("Pass123!")
                .provider(Provider.LOCAL)
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());

        testUser2 = userRepository.save(User.builder()
                .email("lm_user2_" + UUID.randomUUID() + "@example.com")
                .name("Link User Two")
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
        UserPrincipal principal = new UserPrincipal(user.getId(), user.getEmail());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, Collections.emptyList())
        );
    }

    private static String alias() {
        return "alias" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    @Test
    @DisplayName("Custom alias is honored and resolves on redirect")
    void testCustomAliasCreation() {
        authenticate(testUser1);
        String alias = alias();

        ShortenUrlResponse response = urlShortenerService.shortenUrl(
                new ShortenUrlRequest("https://example.com/custom-alias-target", alias));

        assertThat(response.shortUrl()).endsWith("/" + alias);
        UrlEntity entity = urlRepository.findByShortCode(alias).orElseThrow();
        assertThat(entity.getLongUrl()).isEqualTo("https://example.com/custom-alias-target");
        assertThat(entity.getUser().getId()).isEqualTo(testUser1.getId());

        assertThat(urlShortenerService.getOriginalUrl(alias)).isEqualTo("https://example.com/custom-alias-target");
    }

    @Test
    @DisplayName("Generated codes keep their 7-character Base62 format when no alias is supplied")
    void testGeneratedCodeUnaffected() {
        authenticate(testUser1);

        ShortenUrlResponse response = urlShortenerService.shortenUrl(
                new ShortenUrlRequest("https://example.com/no-alias"));

        String shortCode = response.shortUrl().substring(response.shortUrl().lastIndexOf('/') + 1);
        assertThat(shortCode).matches("^[a-zA-Z0-9]{7}$");
    }

    @Test
    @DisplayName("Claiming an alias that is already taken yields a conflict")
    void testDuplicateAliasConflict() {
        String alias = alias();
        authenticate(testUser1);
        urlShortenerService.shortenUrl(new ShortenUrlRequest("https://example.com/first", alias));

        authenticate(testUser2);
        assertThatThrownBy(() -> urlShortenerService.shortenUrl(
                new ShortenUrlRequest("https://example.com/second", alias)))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    @DisplayName("Reserved and malformed aliases are rejected")
    void testInvalidAliasesRejected() {
        authenticate(testUser1);

        assertThatThrownBy(() -> urlShortenerService.shortenUrl(
                new ShortenUrlRequest("https://example.com/reserved", "api")))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() -> urlShortenerService.shortenUrl(
                new ShortenUrlRequest("https://example.com/bad-chars", "not valid!")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Owner can update the destination URL of their link")
    void testOwnerCanUpdateUrl() {
        authenticate(testUser1);
        ShortenUrlResponse response = urlShortenerService.shortenUrl(
                new ShortenUrlRequest("https://example.com/before"));
        String shortCode = response.shortUrl().substring(response.shortUrl().lastIndexOf('/') + 1);

        UserUrlResponse updated = urlShortenerService.updateUrl(
                shortCode, testUser1.getId(), new UpdateUrlRequest("https://example.com/after"));

        assertThat(updated.longUrl()).isEqualTo("https://example.com/after");
        assertThat(urlRepository.findByShortCode(shortCode).orElseThrow().getLongUrl())
                .isEqualTo("https://example.com/after");
    }

    @Test
    @DisplayName("Non-owner cannot update someone else's link")
    void testNonOwnerCannotUpdateUrl() {
        authenticate(testUser1);
        ShortenUrlResponse response = urlShortenerService.shortenUrl(
                new ShortenUrlRequest("https://example.com/owned-by-user1"));
        String shortCode = response.shortUrl().substring(response.shortUrl().lastIndexOf('/') + 1);

        assertThatThrownBy(() -> urlShortenerService.updateUrl(
                shortCode, testUser2.getId(), new UpdateUrlRequest("https://example.com/hijacked")))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Owner can delete their link")
    void testOwnerCanDeleteUrl() {
        authenticate(testUser1);
        ShortenUrlResponse response = urlShortenerService.shortenUrl(
                new ShortenUrlRequest("https://example.com/to-delete"));
        String shortCode = response.shortUrl().substring(response.shortUrl().lastIndexOf('/') + 1);

        urlShortenerService.deleteUrl(shortCode, testUser1.getId());

        assertThat(urlRepository.findByShortCode(shortCode)).isEmpty();
    }

    @Test
    @DisplayName("Non-owner cannot delete someone else's link")
    void testNonOwnerCannotDeleteUrl() {
        authenticate(testUser1);
        ShortenUrlResponse response = urlShortenerService.shortenUrl(
                new ShortenUrlRequest("https://example.com/keep-me"));
        String shortCode = response.shortUrl().substring(response.shortUrl().lastIndexOf('/') + 1);

        assertThatThrownBy(() -> urlShortenerService.deleteUrl(shortCode, testUser2.getId()))
                .isInstanceOf(ResourceNotFoundException.class);

        assertThat(urlRepository.findByShortCode(shortCode)).isPresent();
    }

    @Test
    @DisplayName("Admin listing spans all users and admin delete removes any link")
    void testAdminListAndDelete() {
        authenticate(testUser1);
        ShortenUrlResponse r1 = urlShortenerService.shortenUrl(
                new ShortenUrlRequest("https://example.com/admin-one"));
        String code1 = r1.shortUrl().substring(r1.shortUrl().lastIndexOf('/') + 1);

        authenticate(testUser2);
        ShortenUrlResponse r2 = urlShortenerService.shortenUrl(
                new ShortenUrlRequest("https://example.com/admin-two"));
        String code2 = r2.shortUrl().substring(r2.shortUrl().lastIndexOf('/') + 1);

        Page<UserUrlResponse> all = urlShortenerService.getAllUrls(PageRequest.of(0, 200));
        assertThat(all.getContent()).extracting(UserUrlResponse::shortCode).contains(code1, code2);

        urlShortenerService.adminDeleteUrl(code1);
        assertThat(urlRepository.findByShortCode(code1)).isEmpty();
        assertThat(urlRepository.findByShortCode(code2)).isPresent();
    }
}
