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
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class RateLimiterService {

    /**
     * Result of one consume attempt, sized for the {@code X-RateLimit-*} response headers.
     *
     * @param allowed           whether the request consumed a token
     * @param limit             bucket capacity (per refill window)
     * @param remaining         tokens left after this attempt (may be an estimate for Redis buckets)
     * @param resetEpochSeconds unix-epoch second when the bucket is expected to be full again
     */
    public record BucketConsumption(boolean allowed, int limit, long remaining, long resetEpochSeconds) {
    }

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
     * Standard single-argument check used by callers that only need the allow/deny verdict.
     */
    public boolean isAllowed(String key) {
        return consume(key, BucketType.GENERAL).allowed();
    }

    public boolean isAllowed(String key, BucketType type) {
        return consume(key, type).allowed();
    }

    /**
     * Primary rate check: consumes one token and returns the state needed for
     * {@code X-RateLimit-Limit/-Remaining/-Reset}.
     */
    public BucketConsumption consume(String key, BucketType type) {
        String storageKey = type.name() + ":" + key;
        int limit = type.getCapacity();
        long now = Instant.now().getEpochSecond();
        long durationSeconds = type.getDuration().toSeconds();

        if (useRedis) {
            try {
                ProxyManager<byte[]> manager = getProxyManager();
                if (manager != null) {
                    BucketConfiguration configuration = buildConfiguration(type);
                    Bucket redisBucket = manager.builder().build(storageKey.getBytes(), configuration);
                    boolean allowed = redisBucket.tryConsume(1);
                    return consumption(allowed, now, durationSeconds, limit, safeRemaining(redisBucket, limit));
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
        boolean allowed = localBucket.tryConsume(1);
        return consumption(allowed, now, durationSeconds, limit, safeRemaining(localBucket, limit));
    }

    private long safeRemaining(Bucket bucket, int fallbackLimit) {
        try {
            return bucket.getAvailableTokens();
        } catch (Exception e) {
            // Some Redis proxy strategies cannot answer the estimate; report full capacity.
            return fallbackLimit;
        }
    }

    /**
     * Greedy refill refills {@code limit} tokens over {@code durationSeconds}, so a bucket with
     * {@code remaining} tokens is full again in {@code (limit - remaining) * duration / limit}
     * seconds. Empty buckets therefore reset in one full window.
     */
    private BucketConsumption consumption(boolean allowed, long now, long durationSeconds, int limit, long remaining) {
        long safeRemaining = Math.max(0L, remaining);
        long deficit = Math.max(0L, (long) limit - safeRemaining);
        long offset = deficit == 0
                ? durationSeconds
                : (long) Math.ceil((double) deficit * durationSeconds / Math.max(1, limit));
        long reset = now + Math.min(Math.max(offset, 1), durationSeconds);
        return new BucketConsumption(allowed, limit, safeRemaining, reset);
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