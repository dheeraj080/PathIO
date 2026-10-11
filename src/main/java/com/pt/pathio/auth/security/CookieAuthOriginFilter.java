package com.pt.pathio.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pt.pathio.auth.dto.ApiError;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.util.List;

/**
 * CSRF defense-in-depth for the endpoints that authenticate via the HttpOnly refresh-token cookie
 * ({@code POST /api/v1/auth/refresh} and {@code POST /api/v1/auth/logout}). The cookie itself is
 * HttpOnly + SameSite=Lax; this filter additionally refuses requests whose {@code Origin} (or
 * {@code Referer} when Origin is absent) is neither same-origin nor on the configured allow-list.
 *
 * <p>Non-browser clients that use the cookie must send an allowed {@code Origin} header explicitly.
 * Requests with no Origin header and no Referer are allowed (they could never be fired by a
 * browser cross-site, and SameSite=Lax already blocks cookie forwarding on cross-site POSTs).
 */
public class CookieAuthOriginFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();
    private final List<String> allowedOrigins;

    public CookieAuthOriginFilter(List<String> allowedOrigins) {
        this.allowedOrigins = allowedOrigins;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && path.startsWith(contextPath)) {
            path = path.substring(contextPath.length());
        }
        return !"/api/v1/auth/refresh".equals(path) && !"/api/v1/auth/logout".equals(path);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String origin = firstNonNullBlank(
                request.getHeader(HttpHeaders.ORIGIN),
                request.getHeader(HttpHeaders.REFERER));
        origin = toOrigin(origin);
        if (origin != null && !isAllowed(origin, request)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            objectMapper.writeValue(response.getWriter(),
                    ApiError.of(403, "Forbidden",
                            "Cross-origin requests to cookie-authenticated endpoints are rejected",
                            request.getRequestURI()));
            return;
        }
        filterChain.doFilter(request, response);
    }

    boolean isAllowed(String origin, HttpServletRequest request) {
        if (allowedOrigins.contains(origin)) {
            return true;
        }
        return isSameOrigin(origin, request);
    }

    private boolean isSameOrigin(String origin, HttpServletRequest request) {
        try {
            URI uri = URI.create(origin);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            int port = uri.getPort();
            if (scheme == null || host == null) {
                return false;
            }
            int effectivePort = port == -1 ? ("https".equalsIgnoreCase(scheme) ? 443 : 80) : port;
            return scheme.equalsIgnoreCase(request.getScheme())
                    && host.equalsIgnoreCase(request.getServerName())
                    && effectivePort == request.getServerPort();
        } catch (RuntimeException e) {
            return false;
        }
    }

    private static String firstNonNullBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first.trim();
        }
        if (second != null && !second.isBlank()) {
            return second.trim();
        }
        return null;
    }

    /** Reduces an Origin or Referer value to its origin (scheme://host[:port]); null if unparseable. */
    static String toOrigin(String value) {
        if (value == null) {
            return null;
        }
        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || host == null) {
                return null;
            }
            int port = uri.getPort();
            return port == -1 ? scheme + "://" + host : scheme + "://" + host + ":" + port;
        } catch (RuntimeException e) {
            return null;
        }
    }
}