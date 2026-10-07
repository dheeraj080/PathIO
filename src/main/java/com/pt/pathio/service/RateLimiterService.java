package com.pt.pathio.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.Refill;
import io.github.bucket4j.distributed.ExpirationAfterWriteStrategy;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import io.lettuce.core.RedisClient;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class RateLimiterService {

    @Value("${spring.data.redis.host:localhost}")
    private String redisHost;

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    private volatile ProxyManager<byte[]> proxyManager;
    private final Map<String, Bucket> localFallbackCache = new ConcurrentHashMap<>();
    private volatile boolean useRedis = true;

    /**
     * Tiered bucket definitions specifying capacity and window duration.
     */
    public enum BucketType {
        GENERAL(60, Duration.ofMinutes(1));

        private final int capacity;
        private final Duration duration;

        BucketType(int capacity, Duration duration) {
            this.capacity = capacity;
            this.duration = duration;
        }

        public int getCapacity() {
            return capacity;
        }

        public Duration getDuration() {
            return duration;
        }
    }

    /**
     * Overloaded method for standard single-argument checks.
     */
    public boolean isAllowed(String key) {
        return isAllowed(key, BucketType.GENERAL);
    }

    /**
     * Primary rate check method called by the interceptor, supporting tier types.
     */
    public boolean isAllowed(String key, BucketType type) {
        String storageKey = type.name() + ":" + key;

        if (useRedis) {
            try {
                ProxyManager<byte[]> manager = getProxyManager();
                if (manager != null) {
                    BucketConfiguration configuration = buildConfiguration(type);
                    Bucket redisBucket = manager.builder().build(storageKey.getBytes(), configuration);
                    return redisBucket.tryConsume(1);
                }
            } catch (Exception e) {
                log.warn("Redis rate limiter failed, falling back to local memory cache: {}", e.getMessage());
                useRedis = false;
            }
        }

        // In-memory fallback bucket if Redis is unavailable or failed
        Bucket localBucket = localFallbackCache.computeIfAbsent(storageKey,
                k -> Bucket.builder()
                        .addLimit(Bandwidth.classic(type.getCapacity(), Refill.greedy(type.getCapacity(), type.getDuration())))
                        .build());
        return localBucket.tryConsume(1);
    }

    private ProxyManager<byte[]> getProxyManager() {
        if (proxyManager == null) {
            synchronized (this) {
                if (proxyManager == null) {
                    RedisClient redisClient = RedisClient.create("redis://" + redisHost + ":" + redisPort);
                    this.proxyManager = LettuceBasedProxyManager.builderFor(redisClient)
                            .withExpirationStrategy(ExpirationAfterWriteStrategy.basedOnTimeForRefillingBucketUpToMax(Duration.ofSeconds(60)))
                            .build();
                }
            }
        }
        return proxyManager;
    }

    /**
     * Centralized bucket configuration builder.
     */
    private BucketConfiguration buildConfiguration(BucketType type) {
        return BucketConfiguration.builder()
                .addLimit(Bandwidth.classic(type.getCapacity(), Refill.greedy(type.getCapacity(), type.getDuration())))
                .build();
    }
}