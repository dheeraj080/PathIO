package com.pt.pathio.auth.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Headless tests for {@link CookieAuthOriginFilter} (SEC-06): cross-origin requests to the
 * cookie-authenticated refresh/logout endpoints are rejected unless the Origin/Referer is
 * same-origin or on the configured allow-list.
 */
class CookieAuthOriginFilterTest {

    private final CookieAuthOriginFilter filter = new CookieAuthOriginFilter(
            List.of("http://localhost:5173", "http://localhost:3000")
    );

    private MockHttpServletResponse run(String path, String origin, String referer) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        if (origin != null) {
            request.addHeader(HttpHeaders.ORIGIN, origin);
        }
        if (referer != null) {
            request.addHeader(HttpHeaders.REFERER, referer);
        }
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }

    @Test
    @DisplayName("Allowed origin passes for the refresh endpoint")
    void allowedOriginPasses() throws Exception {
        MockHttpServletResponse response = run("/api/v1/auth/refresh", "http://localhost:5173", null);
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("Same-origin request passes (no allow-list entry needed)")
    void sameOriginPasses() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/auth/refresh");
        request.addHeader(HttpHeaders.ORIGIN, "http://localhost:8080");
        request.setScheme("http");
        request.setServerName("localhost");
        request.setServerPort(8080);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        assertThat(response.getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("Cross-origin request on the logout endpoint is rejected with 403")
    void crossOriginLogoutRejected() throws Exception {
        MockHttpServletResponse response = run("/api/v1/auth/logout", "https://evil.example", null);
        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("403");
        assertThat(response.getContentAsString()).contains("Cross-origin");
    }

    @Test
    @DisplayName("Referer is used as a fallback when Origin is absent")
    void refererFallbackUsed() throws Exception {
        assertThat(run("/api/v1/auth/refresh", null, "http://localhost:3000/page").getStatus()).isEqualTo(200);
        assertThat(run("/api/v1/auth/refresh", null, "https://evil.example/page").getStatus()).isEqualTo(403);
    }

    @Test
    @DisplayName("Requests without Origin or Referer pass (SameSite=Lax already guards browsers)")
    void noOriginOrRefererPasses() throws Exception {
        assertThat(run("/api/v1/auth/refresh", null, null).getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("Non cookie-authenticated endpoints are not filtered")
    void otherEndpointsNotFiltered() throws Exception {
        assertThat(run("/api/v1/shorten", "https://evil.example", null).getStatus()).isEqualTo(200);
    }
}