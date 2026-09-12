package org.path.commom;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

import java.util.concurrent.TimeUnit;

@ApplicationScoped
public class MetricsService {

    private final Counter redirectHitCounter;
    private final Counter cacheMissCounter;
    private final Timer keyGenerationTimer;

    @Inject
    public MetricsService(MeterRegistry registry) {
        this.redirectHitCounter = registry.counter("url_shortener_redirect_hits_total");
        this.cacheMissCounter = registry.counter("url_shortener_cache_misses_total");
        this.keyGenerationTimer = registry.timer("url_shortener_key_generation_duration_seconds");
    }

    public void recordHit() {
        redirectHitCounter.increment();
    }

    public void recordMiss() {
        cacheMissCounter.increment();
    }

    public void recordKeyGenTime(long durationNanos) {
        keyGenerationTimer.record(durationNanos, TimeUnit.NANOSECONDS);
    }
}