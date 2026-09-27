package com.pt.pathio.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class DistributedIdGenerator {

    private static final Logger log = LoggerFactory.getLogger(DistributedIdGenerator.class);

    private static final String SEQUENCE_NAME = "url_sequence";
    private static final long RANGE_SIZE = 10_000L;
    private static final double LOW_WATERMARK_PERCENTAGE = 0.20;

    // 41-bit Max Limit: 2^41 - 1 = 2,199,023,255,551
    private static final long MAX_41_BIT_ID = (1L << 41) - 1;

    private final JdbcTemplate jdbcTemplate;
    private final Object swapLock = new Object();
    private final AtomicBoolean isPrefetching = new AtomicBoolean(false);

    private volatile Range currentRange;
    private volatile Range nextRange;

    public DistributedIdGenerator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void init() {
        log.info("Initializing 41-bit constrained DistributedIdGenerator segments...");
        this.currentRange = fetchNewRangeFromDb();
        this.nextRange = fetchNewRangeFromDb();
    }

    public long nextId() {
        while (true) {
            Range activeRange = this.currentRange;
            long id = activeRange.currentId.getAndIncrement();

            // 1. Successfully generated ID from current active range
            if (id <= activeRange.end) {
                long remaining = activeRange.end - id;
                if (remaining <= (RANGE_SIZE * LOW_WATERMARK_PERCENTAGE)) {
                    triggerAsyncPrefetch();
                }
                return id;
            }

            // 2. Active range exhausted - perform thread-safe buffer swap
            synchronized (swapLock) {
                // Double-check pattern to prevent multiple threads swapping simultaneously
                if (this.currentRange == activeRange) {
                    if (this.nextRange == null) {
                        log.warn("Next buffer segment not ready. Synchronous 41-bit DB fetch triggered.");
                        this.nextRange = fetchNewRangeFromDb();
                    }

                    this.currentRange = this.nextRange;
                    this.nextRange = null;
                    this.isPrefetching.set(false); // Reset prefetch flag for the new active range

                    // Immediately trigger prefetch for the NEXT range now that swap is done
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
                    log.info("Successfully pre-fetched 41-bit segment: [{}-{}]", freshRange.start, freshRange.end);
                } catch (Exception ex) {
                    log.error("Failed to pre-fetch next 41-bit ID range", ex);
                    this.isPrefetching.set(false); // Allow retry on failure
                }
            });
        }
    }

    private Range fetchNewRangeFromDb() {
        // Note: Assumes PostgreSQL syntax (UPDATE ... RETURNING)
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
                    RANGE_SIZE, SEQUENCE_NAME, RANGE_SIZE, MAX_41_BIT_ID, RANGE_SIZE
            );
        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
            log.error("CRITICAL: 41-bit ID space exhausted for sequence: {}", SEQUENCE_NAME);
            throw new IllegalStateException("Maximum 41-bit ID limit (" + MAX_41_BIT_ID + ") has been reached!", e);
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