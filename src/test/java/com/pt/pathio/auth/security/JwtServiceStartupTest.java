package com.pt.pathio.auth.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import com.pt.pathio.auth.entity.User;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Boot-guard tests that prove SEC-01 at the application-context level, without a database:
 * a missing / placeholder / known-insecure JWT secret must fail application startup, and a
 * valid secret must permit it. Uses {@link ApplicationContextRunner} so no database is needed.
 */
class JwtServiceStartupTest {

    private static final String LEGACY_PUBLIC_SECRET = "vS9p8u2M5rX7n4Q1z6W0E3t9Y4A8S5D2F1G7H3J6K9L0P3M1N4B7V2C5X8Z1Q9W0";

    private static final String VALID_TEST_SECRET =
            "boot-test-jwt-secret-0123456789abcdefghijklmnopqrstuvwxyz-ABCDEFGHIJKLMNOPQRSTUVWXYZ-9876543210";

    @Configuration
    static class JwtServiceBootstrapConfig {

        @Bean
        JwtService jwtService(Environment env) {
            return new JwtService(env);
        }
    }

    private ApplicationContextRunner runner() {
        return new ApplicationContextRunner()
                .withUserConfiguration(JwtServiceBootstrapConfig.class);
    }

    @Test
    @DisplayName("Startup fails when the production signing secret is missing")
    void startupFailsWhenSecretMissing() {
        runner().run(ctx -> assertThat(ctx).hasFailed());
    }

    @Test
    @DisplayName("Startup fails when the production signing secret is blank")
    void startupFailsWhenSecretBlank() {
        runner().withPropertyValues("security.jwt.secret=")
                .run(ctx -> assertThat(ctx).hasFailed());
    }

    @Test
    @DisplayName("Startup fails when the secret is a known insecure placeholder")
    void startupFailsForLegacyKnownSecret() {
        runner().withPropertyValues("security.jwt.secret=" + LEGACY_PUBLIC_SECRET)
                .run(ctx -> assertThat(ctx).hasFailed());
    }

    @Test
    @DisplayName("Startup fails when the secret is a short placeholder")
    void startupFailsForShortPlaceholder() {
        runner().withPropertyValues("security.jwt.secret=CHANGE_ME")
                .run(ctx -> assertThat(ctx).hasFailed());
    }

    @Test
    @DisplayName("Startup succeeds with a valid configured secret and tokens round-trip")
    void startupSucceedsWithValidSecret() {
        runner().withPropertyValues("security.jwt.secret=" + VALID_TEST_SECRET)
                .run(ctx -> {
                    assertThat(ctx).hasNotFailed();
                    JwtService jwtService = ctx.getBean(JwtService.class);

                    User user = User.builder()
                            .id(UUID.randomUUID())
                            .email("boot@pathio.test")
                            .enabled(true)
                            .build();

                    Jws<Claims> access = jwtService.parse(jwtService.generateAccessToken(user));
                    assertThat(access.getPayload().get("typ")).isEqualTo("access");
                    assertThat(access.getPayload().getSubject()).isEqualTo(user.getId().toString());
                });
    }

    @Test
    @DisplayName("Dev-only fallback requires both the dev profile AND the explicit flag")
    void devFallbackRequiresProfileAndFlag() {
        runner().withPropertyValues("spring.profiles.active=dev")
                .run(ctx -> assertThat(ctx).hasFailed());

        runner().withPropertyValues(
                        "spring.profiles.active=dev",
                        "security.jwt.dev-fallback=true")
                .run(ctx -> {
                    assertThat(ctx).hasNotFailed();
                    assertThat(ctx.getBean(JwtService.class)).isNotNull();
                });
    }
}