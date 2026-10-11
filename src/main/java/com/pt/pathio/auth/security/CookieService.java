package com.pt.pathio.auth.security;

import jakarta.servlet.http.HttpServletResponse;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.util.Arrays;

/**
 * Builds the HttpOnly refresh-token cookie. Cookie attributes are explicit and environment-aware:
 * <ul>
 *   <li><b>Secure</b> defaults to {@code true} for every non-dev environment (fail closed) and to
 *       {@code false} only under the {@code dev} profile. An explicit
 *       {@code security.jwt.cookie-secure} ({@code JWT_COOKIE_SECURE}) always wins.</li>
 *   <li>HttpOnly, SameSite and Path behavior are configurable with conservative defaults
 *       ({@code true}, {@code Lax}, {@code /}).</li>
 * </ul>
 * Behind a TLS-terminating reverse proxy ensure X-Forwarded-Proto is forwarded if any code ever
 * switches on the request scheme; this service only honors the explicitly configured attribute.
 */
@Service
@Getter
public class CookieService {

    private final String refreshTokenCookieName;
    private final boolean cookieHttpOnly;
    private final boolean cookieSecure;
    private final String cookieDomain;
    private final String cookieSameSite;

    private final Logger logger = LoggerFactory.getLogger(CookieService.class);

    public CookieService(Environment env) {
        this.refreshTokenCookieName = env.getProperty("security.jwt.refresh-token-cookie-name", "refresh_token");
        this.cookieHttpOnly = env.getProperty("security.jwt.cookie-http-only", Boolean.class, true);
        this.cookieDomain = env.getProperty("security.jwt.cookie-domain", "");
        this.cookieSameSite = env.getProperty("security.jwt.cookie-same-site", "Lax");

        String configuredSecure = env.getProperty("security.jwt.cookie-secure");
        boolean devProfileActive = Arrays.asList(env.getActiveProfiles()).contains("dev");
        if (configuredSecure == null || configuredSecure.isBlank()) {
            // Fail closed: Secure=true in every non-dev environment; dev profile only gets
            // plain-HTTP cookies because it is an explicit, documented development environment.
            this.cookieSecure = !devProfileActive;
        } else {
            this.cookieSecure = Boolean.parseBoolean(configuredSecure);
        }
    }

    public void attachRefreshCookie(HttpServletResponse response, String value, int maxAge) {

        logger.info("attach refresh cookie");
        var responseCookieBuilder = ResponseCookie.from(refreshTokenCookieName, value)
                .httpOnly(cookieHttpOnly)
                .secure(cookieSecure)
                .path("/")
                .maxAge(maxAge)
                .sameSite(cookieSameSite);

        if (cookieDomain != null && !cookieDomain.isEmpty()) {
            responseCookieBuilder.domain(cookieDomain);
        }
        ResponseCookie responseCookie = responseCookieBuilder.build();
        response.addHeader(HttpHeaders.SET_COOKIE, responseCookie.toString());
    }

    public void clearRefreshCookie(HttpServletResponse response) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(refreshTokenCookieName, "")
                .maxAge(0)
                .httpOnly(cookieHttpOnly)
                .path("/")
                .sameSite(cookieSameSite)
                .secure(cookieSecure);

        if (cookieDomain != null && !cookieDomain.isEmpty()) {
            builder.domain(cookieDomain);
        }
        ResponseCookie responseCookie = builder.build();
        response.addHeader(HttpHeaders.SET_COOKIE, responseCookie.toString());
    }

    public void addNoStoreHeader(HttpServletResponse response) {
        response.addHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        response.addHeader(HttpHeaders.PRAGMA, "no-cache");
    }


}