package com.pt.pathio.auth.security;

import com.pt.pathio.auth.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Headless unit tests for the {@link JwtService} signing-secret boot guard.
 * These tests deliberately do not load a Spring context and therefore run without
 * a database. They pin the SEC-01 behavior: no known/default secret may silently
 * sign tokens, and a valid secret must still work for generate/parse round trips.
 *
 * <p>The "known insecure secret" referenced here is used verbatim in these tests so
 * that any future regression re-introducing it fails loudly. It is the legacy,
 * publicly-known default that previously shipped with the application.
 */
class JwtServiceUnitTest {

    private static final String LEGACY_PUBLIC_SECRET = "vS9p8u2M5rX7n4Q1z6W0E3t9Y4A8S5D2F1G7H3J6K9L0P3M1N4B7V2C5X8Z1Q9W0";

    private static final String VALID_TEST_SECRET =
            "unit-test-jwt-secret-0123456789abcdefghijklmnopqrstuvwxyz-ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789";

    @Test
    @DisplayName("Missing secret fails construction when no dev profile is active")
    void missingSecretWithoutDevProfileFails() {
        MockEnvironment env = new MockEnvironment();

        assertThatThrownBy(() -> new JwtService(env))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("No JWT signing secret is configured");
    }

    @Test
    @DisplayName("Blank secret fails construction when no dev profile is active")
    void blankSecretFails() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("security.jwt.secret", "   ");

        assertThatThrownBy(() -> new JwtService(env))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("No JWT signing secret is configured");
    }

    @Test
    @DisplayName("The legacy publicly-known secret is rejected even though it is 64+ chars")
    void legacyKnownSecretIsRejected() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("security.jwt.secret", LEGACY_PUBLIC_SECRET);

        assertThatThrownBy(() -> new JwtService(env))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("known insecure or placeholder");
    }

    @Test
    @DisplayName("Short placeholder values are rejected")
    void shortPlaceholderIsRejected() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("security.jwt.secret", "CHANGE_ME");

        assertThatThrownBy(() -> new JwtService(env))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("at least 64 characters");
    }

    @Test
    @DisplayName("A randomly generated valid secret constructs and round-trips tokens")
    void validSecretConstructsAndRoundTripsTokens() {
        JwtService jwtService = new JwtService(
                new MockEnvironment().withProperty("security.jwt.secret", VALID_TEST_SECRET));

        User user = User.builder()
                .id(UUID.randomUUID())
                .email("roundtrip@pathio.test")
                .enabled(true)
                .build();

        Jws<Claims> access = jwtService.parse(jwtService.generateAccessToken(user));
        assertThat(access.getPayload().get("typ")).isEqualTo("access");
        assertThat(access.getPayload().getSubject()).isEqualTo(user.getId().toString());
        assertThat(access.getPayload().get("email")).isEqualTo("roundtrip@pathio.test");

        Jws<Claims> refresh = jwtService.parse(jwtService.generateRefreshToken(user, "jti-1"));
        assertThat(refresh.getPayload().get("typ")).isEqualTo("refresh");
        assertThat(refresh.getPayload().getId()).isEqualTo("jti-1");
    }

    @Test
    @DisplayName("Dev profile alone (without the explicit flag) still refuses to start")
    void devProfileWithoutExplicitOptInStillFails() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("spring.profiles.active", "dev");

        assertThatThrownBy(() -> new JwtService(env))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("No JWT signing secret is configured");
    }

    @Test
    @DisplayName("Dev profile + explicit dev-fallback flag permits the documented dev-only secret")
    void devProfileWithExplicitOptInUsesDocumentedDevFallback() {
        JwtService jwtService = new JwtService(
                new MockEnvironment()
                        .withProperty("spring.profiles.active", "dev")
                        .withProperty("security.jwt.dev-fallback", "true"));

        User user = User.builder()
                .id(UUID.randomUUID())
                .email("dev@pathio.test")
                .enabled(true)
                .build();

        Jws<Claims> access = jwtService.parse(jwtService.generateAccessToken(user));
        assertThat(access.getPayload().get("typ")).isEqualTo("access");
        assertThat(access.getPayload().getSubject()).isEqualTo(user.getId().toString());
    }

    @Test
    @DisplayName("Startup error messages never leak the configured secret value")
    void failureMessagesNeverLeakTheSecretValue() {
        MockEnvironment legacyEnv = new MockEnvironment()
                .withProperty("security.jwt.secret", LEGACY_PUBLIC_SECRET);
        assertThatThrownBy(() -> new JwtService(legacyEnv))
                .satisfies(t -> assertThat(t.getMessage()).doesNotContain(LEGACY_PUBLIC_SECRET));

        MockEnvironment missingEnv = new MockEnvironment();
        assertThatThrownBy(() -> new JwtService(missingEnv))
                .satisfies(t -> assertThat(t.getMessage()).doesNotContain("vS9p8u2M5rX7n4Q1"));
    }
}