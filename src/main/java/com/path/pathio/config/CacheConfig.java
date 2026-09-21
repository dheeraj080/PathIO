package com.path.pathio.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Configuration
public class CacheConfig {

    @Value("${app.cache.l1.max-size:100000}")
    private int l1MaxSize;

    @Value("${app.cache.l1.ttl-minutes:10}")
    private int l1TtlMinutes;

    /**
     * L1 In-Memory Caffeine Cache.
     * Keeps hot short-codes in JVM heap memory. Bypasses L2 network calls entirely.
     */
    @Bean
    public Cache<String, String> l1UrlCache() {
        return Caffeine.newBuilder()
                .maximumSize(l1MaxSize)
                .expireAfterAccess(l1TtlMinutes, TimeUnit.MINUTES)
                .recordStats()
                .build();
    }

    /**
     * L2 Distributed Redis Cache.
     * Shared across all monolithic application nodes.
     */
    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory connectionFactory) {
        return new StringRedisTemplate(connectionFactory);
    }
}
