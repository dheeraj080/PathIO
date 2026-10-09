package com.pt.pathio.interceptor;

import com.pt.pathio.metrics.PathioMetrics;
import com.pt.pathio.service.RateLimiterService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitInterceptor implements HandlerInterceptor {

    private final RateLimiterService rateLimiterService;
    private final PathioMetrics pathioMetrics;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Extract client IP securely (supporting standard proxy/load balancer headers)
        String clientIp = extractClientIp(request);
        String key = "ip:" + clientIp;

        if (rateLimiterService.isAllowed(key)) {
            return true; // Allowed
        }

        pathioMetrics.incrementRateLimitBlocked();
        log.warn("Rate limit exceeded for IP: {} on URI: {}", clientIp, request.getRequestURI());

        // Rate limit exceeded response
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType("application/json");
        response.getWriter().write("{\"error\": \"Too many requests\", \"message\": \"Rate limit exceeded. Please try again later.\"}");
        return false;
    }

    private String extractClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}