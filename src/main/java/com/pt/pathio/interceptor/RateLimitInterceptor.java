package com.pt.pathio.interceptor;

import com.pt.pathio.auth.security.ApiKeyAuthenticationFilter;
import com.pt.pathio.metrics.PathioMetrics;
import com.pt.pathio.service.RateLimiterService;
import com.pt.pathio.service.RateLimiterService.BucketConsumption;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Instant;

@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitInterceptor implements HandlerInterceptor {

    private final RateLimiterService rateLimiterService;
    private final PathioMetrics pathioMetrics;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        Object apiKeyHash = request.getAttribute(ApiKeyAuthenticationFilter.ATTR_API_KEY_HASH);
        String bucketIdentity = apiKeyHash instanceof String hash && !hash.isBlank()
                ? "api key"                      // per-key bucket, never logs the digest
                : extractClientIp(request);      // per-IP bucket
        String bucketKey = apiKeyHash instanceof String hash && !hash.isBlank()
                ? "apikey:" + hash
                : "ip:" + extractClientIp(request);

        BucketConsumption consumption =
                rateLimiterService.consume(bucketKey, RateLimiterService.BucketType.GENERAL);
        writeRateLimitHeaders(response, consumption);

        if (consumption.allowed()) {
            return true;
        }

        pathioMetrics.incrementRateLimitBlocked();
        log.warn("Rate limit exceeded for {} on URI: {}", bucketIdentity, request.getRequestURI());

        long retryAfter = Math.max(1L, consumption.resetEpochSeconds() - Instant.now().getEpochSecond());
        response.setHeader("Retry-After", String.valueOf(retryAfter));
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType("application/json");
        response.getWriter().write("{\"error\": \"Too many requests\", \"message\": \"Rate limit exceeded. Please try again later.\"}");
        return false;
    }

    private void writeRateLimitHeaders(HttpServletResponse response, BucketConsumption consumption) {
        response.setHeader("X-RateLimit-Limit", String.valueOf(consumption.limit()));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(consumption.remaining()));
        response.setHeader("X-RateLimit-Reset", String.valueOf(consumption.resetEpochSeconds()));
    }

    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}