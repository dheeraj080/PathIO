package com.pt.pathio.auth.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Guards SEC-01 at the configuration-file level: the committed application configuration and the
 * environment template must never embed a usable signing key or a default fallback secret.
 * The legacy, publicly-known secret is embedded here verbatim so that any accidental re-introduction
 * is detected by test failure.
 */
class JwtConfigurationFilesTest {

    /** The legacy, publicly-known secret that used to ship as the default. */
    private static final String LEGACY_PUBLIC_SECRET = "vS9p8u2M5rX7n4Q1z6W0E3t9Y4A8S5D2F1G7H3J6K9L0P3M1N4B7V2C5X8Z1Q9W0";

    @Test
    @DisplayName("application.properties has no default secret and no known-key fallback")
    void applicationPropertiesHasNoDefaultSecret() throws IOException {
        ClassPathResource resource = new ClassPathResource("application.properties");
        assertThat(resource.exists()).as("application.properties must exist on the classpath").isTrue();

        String content;
        try (InputStream in = resource.getInputStream()) {
            content = new String(in.readAllBytes(), StandardCharsets.UTF_8);
        }

        assertThat(content).as("production configuration must not contain the legacy known secret")
                .doesNotContain(LEGACY_PUBLIC_SECRET);
        assertThat(content).as("security.jwt.secret must have an empty default so missing JWT_SECRET fails startup")
                .contains("security.jwt.secret=${JWT_SECRET:}");
    }

    @Test
    @DisplayName(".env.example contains a placeholder, never a usable signing key")
    void envExampleContainsOnlyAPlaceholder() throws IOException {
        java.nio.file.Path envExample = Paths.get(".env.example");
        assumeTrue(Files.exists(envExample), ".env.example not found from working directory; skipping");

        String content = new String(Files.readAllBytes(envExample), StandardCharsets.UTF_8);

        assertThat(content).as("environment template must not contain the legacy known secret")
                .doesNotContain(LEGACY_PUBLIC_SECRET);
        assertThat(content).as("environment template must not contain any 64+ char usable key on the JWT_SECRET line")
                .doesNotContain("JWT_SECRET=vS9p8u2M5rX7n4Q1");
        assertThat(content).as("environment template must contain the explicit placeholder")
                .contains("JWT_SECRET=CHANGE_ME");
    }
}