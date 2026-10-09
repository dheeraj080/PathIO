package com.pt.pathio.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.DistributionSummary;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * Centralized metrics registry for PathIO domain events and operations.
 */
@Component
public class PathioMetrics {

    private final Counter urlShortenSuccessCounter;
    private final Counter urlShortenFailureCounter;
    private final Counter cacheHitCounter;
    private final Counter cacheMissCounter;
    private final Counter rateLimitBlockedCounter;
    private final Timer redirectLatencyTimer;
    private final DistributionSummary clickFlushBatchSummary;

    public PathioMetrics(MeterRegistry registry) {
        this.urlShortenSuccessCounter = Counter.builder("pathio.url.shorten")
                .tag("status", "success")
                .description("Number of URLs successfully shortened")
                .register(registry);

        this.urlShortenFailureCounter = Counter.builder("pathio.url.shorten")
                .tag("status", "failure")
                .description("Number of URL shortening requests that failed")
                .register(registry);

        this.cacheHitCounter = Counter.builder("pathio.url.redirect.cache")
                .tag("result", "hit")
                .description("Number of redirect queries served from Redis cache")
                .register(registry);

        this.cacheMissCounter = Counter.builder("pathio.url.redirect.cache")
                .tag("result", "miss")
                .description("Number of redirect queries falling back to PostgreSQL DB")
                .register(registry);

        this.rateLimitBlockedCounter = Counter.builder("pathio.ratelimit.blocked")
                .tag("bucket", "general")
                .description("Number of requests rejected by rate limiter (HTTP 429)")
                .register(registry);

        this.redirectLatencyTimer = Timer.builder("pathio.url.redirect.latency")
                .description("Time taken to resolve and redirect a short code")
                .publishPercentiles(0.5, 0.9, 0.95, 0.99)
                .register(registry);

        this.clickFlushBatchSummary = DistributionSummary.builder("pathio.analytics.flushed.clicks")
                .description("Number of click events flushed from Redis to PostgreSQL per batch")
                .register(registry);
    }

    public void incrementUrlShortened() {
        urlShortenSuccessCounter.increment();
    }

    public void incrementUrlShortenFailed() {
        urlShortenFailureCounter.increment();
    }

    public void incrementCacheHit() {
        cacheHitCounter.increment();
    }

    public void incrementCacheMiss() {
        cacheMissCounter.increment();
    }

    public void incrementRateLimitBlocked() {
        rateLimitBlockedCounter.increment();
    }

    public void recordRedirectLatency(long durationMillis) {
        redirectLatencyTimer.record(durationMillis, TimeUnit.MILLISECONDS);
    }

    public void recordFlushedClicks(long count) {
        clickFlushBatchSummary.record(count);
    }
}
