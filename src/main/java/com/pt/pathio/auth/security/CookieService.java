package com.pt.pathio.auth.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Getter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@Getter
public class CookieService {

    @Value("${security.jwt.refresh-token-cookie-name:refresh_token}")
    private String refreshTokenCookieName;

    @Value("${security.jwt.cookie-http-only:true}")
    private boolean cookieHttpOnly;

    @Value("${security.jwt.cookie-secure:false}")
    private boolean cookieSecure;

    @Value("${security.jwt.cookie-domain:}")
    private String cookieDomain;

    @Value("${security.jwt.cookie-same-site:Lax}")
    private String cookieSameSite;

    private final Logger logger = LoggerFactory.getLogger(CookieService.class);

    public CookieService() {
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