package com.path.pathio.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Service
public class RateLimiterService {

    private final StringRedisTemplate redisTemplate;
    @SuppressWarnings("rawtypes")
    private final RedisScript<List> rateLimiterLuaScript;

    public RateLimiterService(
            StringRedisTemplate redisTemplate,
            @SuppressWarnings("rawtypes") RedisScript<List> rateLimiterLuaScript) {
        this.redisTemplate = redisTemplate;
        this.rateLimiterLuaScript = rateLimiterLuaScript;
    }

    public RateLimitResult isAllowed(String key, int maxLimit, long windowMillis) {
        long now = Instant.now().toEpochMilli();
        String requestId = UUID.randomUUID().toString();

        @SuppressWarnings("unchecked")
        List<Long> result = redisTemplate.execute(
                rateLimiterLuaScript,
                Collections.singletonList(key),
                String.valueOf(now),
                String.valueOf(windowMillis),
                String.valueOf(maxLimit),
                requestId
        );

        if (result != null && !result.isEmpty()) {
            boolean allowed = result.get(0) == 1L;
            long remaining = result.get(1);
            return new RateLimitResult(allowed, remaining, maxLimit);
        }

        // Fallback: If Redis is unreachable, fail-open to avoid service outage
        return new RateLimitResult(true, 1, maxLimit);
    }

    public record RateLimitResult(boolean isAllowed, long remaining, long limit) {
    }
}