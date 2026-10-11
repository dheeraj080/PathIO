package com.pt.pathio.auth.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Headless tests for {@link CookieService} cookie-attribute defaults (SEC-03): Secure must default
 * to {@code true} in non-dev environments (fail closed), {@code false} under the dev profile, and an
 * explicit override must always win.
 */
class CookieServiceTest {

    private CookieService cookieService(String secureValue, String... profiles) {
        MockEnvironment env = new MockEnvironment();
        if (secureValue != null) {
            env.withProperty("security.jwt.cookie-secure", secureValue);
        }
        for (String profile : profiles) {
            env.setActiveProfiles(profile);
        }
        return new CookieService(env);
    }

    private String attachAndRead(CookieService service) {
        MockHttpServletResponse response = new MockHttpServletResponse();
        service.attachRefreshCookie(response, "refresh-token-value", 3600);
        return response.getHeaders(HttpHeaders.SET_COOKIE).getFirst();
    }

    @Test
    @DisplayName("Secure defaults to true outside dev (fail closed)")
    void secureDefaultsToTrueOutsideDev() {
        String cookie = attachAndRead(cookieService(null));
        assertThat(cookie).contains("Secure");
        assertThat(cookie).contains("HttpOnly");
        assertThat(cookie).contains("SameSite=Lax");
        assertThat(cookie).contains("Path=/");
        assertThat(cookie).contains("Max-Age=3600");
    }

    @Test
    @DisplayName("dev profile defaults Secure to false so plain-HTTP local development works")
    void devProfileDefaultsSecureToFalse() {
        String cookie = attachAndRead(cookieService(null, "dev"));
        assertThat(cookie).doesNotContain("Secure");
        assertThat(cookie).contains("HttpOnly");
    }

    @Test
    @DisplayName("Explicit override wins over profile defaults")
    void explicitOverrideWins() {
        assertThat(attachAndRead(cookieService("false"))).doesNotContain("Secure");
        assertThat(attachAndRead(cookieService("true", "dev"))).contains("Secure");
    }

    @Test
    @DisplayName("Clearing the cookie keeps the same hardening attributes")
    void clearCookieKeepsAttributes() {
        MockHttpServletResponse response = new MockHttpServletResponse();
        cookieService(null).clearRefreshCookie(response);
        String cookie = response.getHeaders(HttpHeaders.SET_COOKIE).getFirst();
        assertThat(cookie).contains("Secure");
        assertThat(cookie).contains("HttpOnly");
        assertThat(cookie).contains("Max-Age=0");
    }
}