package com.pt.pathio.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pt.pathio.auth.UserPrincipal;
import com.pt.pathio.auth.dto.ApiError;
import com.pt.pathio.auth.entity.ApiKey;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.service.ApiKeyService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;

/**
 * Authenticates requests that present an {@code X-API-Key} header by resolving the key's SHA-256
 * digest. Runs <em>after</em> the JWT filter, so a Bearer token always takes precedence; when both
 * are absent the request stays anonymous. A present-but-invalid key fails closed with 401 instead of
 * sliding through as anonymous, and the owning user is loaded into the {@link UserPrincipal} so
 * method security and ownership checks behave exactly like JWT-authenticated requests.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-API-Key";
    /** Request attribute the rate-limit interceptor reads to bucket by key instead of client IP. */
    public static final String ATTR_API_KEY_HASH = "pathio.api-key-hash";

    private final ApiKeyService apiKeyService;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String apiKey = request.getHeader(HEADER);
        if (apiKey == null || apiKey.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        // A Bearer token already authenticated the request; the API key must not override it.
        if (SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        String keyHash = ApiKeyService.hash(apiKey);
        java.util.Optional<ApiKey> found = apiKeyService.findByKeyHash(keyHash);
        if (found.isEmpty() || !isUsable(found.get())) {
            log.warn("Rejected API-key auth on {} (unknown, revoked, or expired key)", request.getRequestURI());
            sendUnauthorized(response, "Invalid API key", request.getRequestURI());
            return;
        }

        User user = found.get().getUser();
        if (!user.isEnabled()) {
            log.warn("Rejected API-key auth for disabled account {} on {}", user.getEmail(), request.getRequestURI());
            sendUnauthorized(response, "Account is disabled", request.getRequestURI());
            return;
        }

        UserPrincipal principal = new UserPrincipal(user.getId(), user.getEmail());
        UsernamePasswordAuthenticationToken authentication =
                new UsernamePasswordAuthenticationToken(principal, null, user.getAuthorities());
        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // The interceptor uses the digest to rate-limit per key and to emit X-RateLimit-* headers.
        request.setAttribute(ATTR_API_KEY_HASH, keyHash);
        apiKeyService.markUsed(found.get().getId());

        filterChain.doFilter(request, response);
    }

    private boolean isUsable(ApiKey key) {
        if (!key.isActive()) {
            return false;
        }
        Instant expiresAt = key.getExpiresAt();
        return expiresAt == null || expiresAt.isAfter(Instant.now());
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri.startsWith("/api/v1/auth")
                || uri.startsWith("/login")
                || uri.startsWith("/oauth2")
                || uri.startsWith("/error")
                || uri.startsWith("/v3/api-docs")
                || uri.startsWith("/swagger-ui")
                || uri.startsWith("/api/public");
    }

    private void sendUnauthorized(HttpServletResponse response, String message, String path) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), ApiError.of(401, "Unauthorized", message, path));
    }
}