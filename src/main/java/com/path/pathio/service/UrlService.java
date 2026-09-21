package com.path.pathio.service;


import com.github.benmanes.caffeine.cache.Cache;
import com.path.pathio.entity.UrlMapping;
import com.path.pathio.gateway.CloudflareSyncService;
import com.path.pathio.keygen.KeyGeneratorService;
import com.path.pathio.repository.UrlMappingRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Service
public class UrlService {

    private static final Logger log = LoggerFactory.getLogger(UrlService.class);
    private static final String REDIS_PREFIX = "url:";
    private static final String NULL_SENTINEL = "NOT_FOUND"; // Prevents Cache Penetration

    private final UrlMappingRepository repository;
    private final KeyGeneratorService keyGeneratorService;
    private final Cache<String, String> l1Cache;
    private final StringRedisTemplate l2RedisTemplate;
    private final Duration l2Ttl;
    private final CloudflareSyncService cloudflareSyncService;

    public UrlService(
            UrlMappingRepository repository,
            KeyGeneratorService keyGeneratorService,
            Cache<String, String> l1Cache,
            StringRedisTemplate l2RedisTemplate,
            @Value("${app.cache.l2.ttl-hours:24}") int l2TtlHours, CloudflareSyncService cloudflareSyncService) {
        this.repository = repository;
        this.keyGeneratorService = keyGeneratorService;
        this.l1Cache = l1Cache;
        this.l2RedisTemplate = l2RedisTemplate;
        this.l2Ttl = Duration.ofHours(l2TtlHours);
        this.cloudflareSyncService = cloudflareSyncService;
    }

    /**
     * WRITE PATH: Create Short URL
     * 1. Generates obfuscated Base62 key via Segment KeyGenerator
     * 2. Saves record to Persistent DB
     * 3. Pre-populates L2 Redis & L1 Caffeine Cache
     */
    @Transactional
    public UrlMapping shortenUrl(String originalUrl, Long userId, Instant expiresAt) {
        String shortCode = keyGeneratorService.generateKey();
        UrlMapping mapping = new UrlMapping(shortCode, originalUrl, userId, expiresAt);

        UrlMapping saved = repository.save(mapping);

        // Pre-populate Caches for zero-latency initial reads
        cacheUrl(shortCode, originalUrl);
        cloudflareSyncService.syncToEdgeKv(shortCode, originalUrl);

        return saved;
    }

    /**
     * READ PATH: High-Performance Multi-Level Lookup
     * Tier 1: L1 Caffeine Cache (< 0.1ms)
     * Tier 2: L2 Redis Cluster   (~1 - 3ms)
     * Tier 3: Sharded Database  (~10 - 20ms)
     */
    public Optional<String> getOriginalUrl(String shortCode) {
        // 1. Check L1 Caffeine
        String targetUrl = l1Cache.getIfPresent(shortCode);
        if (targetUrl != null) {
            return returnOrEmpty(targetUrl);
        }

        // 2. Check L2 Redis
        String redisKey = REDIS_PREFIX + shortCode;
        targetUrl = l2RedisTemplate.opsForValue().get(redisKey);
        if (targetUrl != null) {
            // Populate L1 for future requests on this node
            l1Cache.put(shortCode, targetUrl);
            return returnOrEmpty(targetUrl);
        }

        // 3. Fallback to Primary Database (Double Cache Miss)
        Optional<UrlMapping> dbMapping = repository.findByShortCode(shortCode);

        if (dbMapping.isPresent()) {
            UrlMapping mapping = dbMapping.get();

            // Handle URL expiration
            if (mapping.getExpiresAt() != null && mapping.getExpiresAt().isBefore(Instant.now())) {
                cacheNegativeLookaside(shortCode);
                return Optional.empty();
            }

            targetUrl = mapping.getOriginalUrl();
            cacheUrl(shortCode, targetUrl);
            return Optional.of(targetUrl);
        } else {
            // Cache negative lookup to protect DB from brute-force / cache-penetration attacks
            cacheNegativeLookaside(shortCode);
            return Optional.empty();
        }
    }

    private void cacheUrl(String shortCode, String originalUrl) {
        l1Cache.put(shortCode, originalUrl);
        l2RedisTemplate.opsForValue().set(REDIS_PREFIX + shortCode, originalUrl, l2Ttl);
    }

    private void cacheNegativeLookaside(String shortCode) {
        l1Cache.put(shortCode, NULL_SENTINEL);
        l2RedisTemplate.opsForValue().set(REDIS_PREFIX + shortCode, NULL_SENTINEL, Duration.ofMinutes(5));
    }

    private Optional<String> returnOrEmpty(String urlValue) {
        return NULL_SENTINEL.equals(urlValue) ? Optional.empty() : Optional.of(urlValue);
    }
}
