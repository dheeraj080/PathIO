package com.pt.pathio.service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class IdGenerator {

    private static final Logger log = LoggerFactory.getLogger(IdGenerator.class);

    private static final String SEQUENCE_NAME = "url_sequence";
    private static final long RANGE_SIZE = 10_000L;
    private static final double LOW_WATERMARK_PERCENTAGE = 0.20;
    private static final long MAX_40_BIT_ID = (1L << 40) - 1;

    private final JdbcTemplate jdbcTemplate;
    private final Object swapLock = new Object();
    private final AtomicBoolean isPrefetching = new AtomicBoolean(false);

    // Dedicated single-thread executor to prevent ForkJoinPool thread starvation under high load
    private final ExecutorService prefetchExecutor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "id-generator-prefetch");
        t.setDaemon(true);
        return t;
    });

    private volatile Range currentRange;
    private volatile Range nextRange;

    public IdGenerator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void init() {
        log.info("Initializing 40-bit constrained IdGenerator segments...");
        this.currentRange = fetchNewRangeFromDb();
        this.nextRange = fetchNewRangeFromDb();
    }

    @PreDestroy
    public void destroy() {
        log.info("Shutting down IdGenerator prefetch executor...");
        prefetchExecutor.shutdown();
        try {
            if (!prefetchExecutor.awaitTermination(3, TimeUnit.SECONDS)) {
                prefetchExecutor.shutdownNow();
            }
        } catch (InterruptedException e) {
            prefetchExecutor.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }

    public long nextId() {
        while (true) {
            Range activeRange = this.currentRange;
            long id = activeRange.currentId.getAndIncrement();

            if (id <= activeRange.end) {
                long remaining = activeRange.end - id;

                if (remaining <= (long) (RANGE_SIZE * LOW_WATERMARK_PERCENTAGE)) {
                    triggerAsyncPrefetch();
                }
                return id;
            }

            synchronized (swapLock) {
                if (this.currentRange == activeRange) {
                    if (this.nextRange == null) {
                        log.warn("Next buffer segment not ready. Synchronous DB fetch triggered.");
                        this.nextRange = fetchNewRangeFromDb();
                    }

                    this.currentRange = this.nextRange;
                    this.nextRange = null;
                    this.isPrefetching.set(false);
                    triggerAsyncPrefetch();
                }
            }
        }
    }

    private void triggerAsyncPrefetch() {
        // Atomic flag ensures ONLY ONE thread triggers the background task
        if (this.nextRange == null && isPrefetching.compareAndSet(false, true)) {
            CompletableFuture.runAsync(() -> {
                try {
                    Range freshRange = fetchNewRangeFromDb();
                    synchronized (swapLock) {
                        this.nextRange = freshRange;
                    }
                    log.info("Successfully pre-fetched 40-bit segment: [{}-{}]", freshRange.start, freshRange.end);
                } catch (Exception ex) {
                    log.error("Failed to pre-fetch next 40-bit ID range", ex);
                    this.isPrefetching.set(false); // Allow retry on failure
                }
            }, prefetchExecutor);
        }
    }

    private Range fetchNewRangeFromDb() {
        String sql = """
                UPDATE id_generator 
                SET next_id = next_id + ? 
                WHERE sequence_name = ? AND next_id + ? <= ?
                RETURNING next_id - ? AS range_start, next_id - 1 AS range_end
                """;

        try {
            return jdbcTemplate.queryForObject(
                    sql,
                    (rs, rowNum) -> {
                        long start = rs.getLong("range_start");
                        long end = rs.getLong("range_end");
                        return new Range(start, end);
                    },
                    RANGE_SIZE, SEQUENCE_NAME, RANGE_SIZE, MAX_40_BIT_ID, RANGE_SIZE
            );
        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
            log.error("CRITICAL: 40-bit ID space exhausted for sequence: {}", SEQUENCE_NAME);
            throw new IllegalStateException("Maximum 40-bit ID limit (" + MAX_40_BIT_ID + ") has been reached!", e);
        }
    }

    private static class Range {
        private final long start;
        private final long end;
        private final AtomicLong currentId;

        public Range(long start, long end) {
            this.start = start;
            this.end = end;
            this.currentId = new AtomicLong(start);
        }
    }
}