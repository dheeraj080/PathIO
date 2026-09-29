package com.pt.pathio.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class RateLimiterService {

    private final StringRedisTemplate redisTemplate;

    private static final long MAX_REQUESTS = 10; // Max requests allowed
    private static final long WINDOW_SECONDS = 60; // Time window in seconds (1 minute)
    private static final String RATE_LIMIT_PREFIX = "rate_limit:";

    public boolean isAllowed(String clientIp) {
        String key = RATE_LIMIT_PREFIX + clientIp;

        // Atomically increment the request count for this client
        Long currentRequests = redisTemplate.opsForValue().increment(key);

        // If this is the first request in the current window, set an expiration time
        if (currentRequests != null && currentRequests == 1) {
            redisTemplate.expire(key, Duration.ofSeconds(WINDOW_SECONDS));
        }

        // Return true if under the limit, false if exceeded
        return currentRequests != null && currentRequests <= MAX_REQUESTS;
    }
}