package com.path.pathio.gateway;

import com.path.pathio.service.RateLimiterService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.util.Set;

import java.io.IOException;

@Component
@Order(1) // Run before Spring Security or Business Logic Filters
public class RateLimitingFilter extends OncePerRequestFilter {

    private final RateLimiterService rateLimiterService;

    // Policies: Read vs Write
    private static final int WRITE_LIMIT_PER_MIN = 10;           // 10 req / min
    private static final long WRITE_WINDOW_MS = 60_000L;

    private static final int READ_LIMIT_PER_SEC = 1000;          // 1000 req / sec
    private static final long READ_WINDOW_MS = 1_000L;

    private static final Set<String> TRUSTED_PROXIES = Set.of("10.0.0.1", "172.16.0.1");

    public RateLimitingFilter(RateLimiterService rateLimiterService) {
        this.rateLimiterService = rateLimiterService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String clientIp = extractClientIp(request);
        String path = request.getRequestURI();
        String method = request.getMethod();

        RateLimiterService.RateLimitResult result;

        if ("POST".equalsIgnoreCase(method) && path.startsWith("/api/v1/urls")) {
            // WRITE RULE (Strict)
            String redisKey = "rate:write:" + clientIp;
            result = rateLimiterService.isAllowed(redisKey, WRITE_LIMIT_PER_MIN, WRITE_WINDOW_MS);
        } else {
            // READ RULE (Generous - 302 Redirects)
            String redisKey = "rate:read:" + clientIp;
            result = rateLimiterService.isAllowed(redisKey, READ_LIMIT_PER_SEC, READ_WINDOW_MS);
        }

        // Set Standard Rate Limiting Response Headers
        response.setHeader("X-RateLimit-Limit", String.valueOf(result.limit()));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(result.remaining()));

        if (!result.isAllowed()) {
            response.setHeader("Retry-After", "1");
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\": \"Too many requests. Please slow down.\"}");
            return; // Short-circuit request processing
        }

        filterChain.doFilter(request, response);
    }

    private String extractClientIp(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();
        if (TRUSTED_PROXIES.contains(remoteAddr)) {
            String xfHeader = request.getHeader("X-Forwarded-For");
            if (xfHeader != null && !xfHeader.isEmpty()) {
                return xfHeader.split(",")[0].trim();
            }
        }
        return remoteAddr;
    }
}
