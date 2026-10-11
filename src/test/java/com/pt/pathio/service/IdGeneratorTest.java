package com.pt.pathio.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Headless tests for {@link IdGenerator} segment allocation (IDG-02): IDs must increase
 * monotonically across segment hand-off, the fetch must be bounded by the 40-bit ceiling, and
 * exhausting the space must surface a clear error rather than silently reuse IDs.
 */
class IdGeneratorTest {

    private static final long MAX_40_BIT_ID = (1L << 40) - 1;
    private static final long RANGE_SIZE = 10_000L;

    private static IdGenerator.Range range(long start) {
        return new IdGenerator.Range(start, start + RANGE_SIZE - 1, new AtomicLong(start));
    }

    @SuppressWarnings("unchecked")
    private JdbcTemplate jdbcReturning(AtomicInteger calls) {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(anyString(), any(RowMapper.class),
                anyLong(), anyString(), anyLong(), anyLong(), anyLong()))
                .thenAnswer(invocation -> range(1L + (calls.getAndIncrement()) * RANGE_SIZE));
        return jdbc;
    }

    @Test
    @DisplayName("IDs increase monotonically across segment hand-off")
    void idsIncreaseMonotonicallyAcrossHandoff() {
        IdGenerator generator = new IdGenerator(jdbcReturning(new AtomicInteger()));
        generator.init();
        try {
            long previous = generator.nextId();
            assertThat(previous).isEqualTo(1L);
            for (int i = 0; i < 30_000; i++) {
                long current = generator.nextId();
                assertThat(current).isGreaterThan(previous);
                previous = current;
            }
        } finally {
            generator.destroy();
        }
    }

    @Test
    @DisplayName("Range fetch is bounded by the 40-bit ceiling")
    void rangeFetchIsBoundedByFortyBits() {
        JdbcTemplate jdbc = jdbcReturning(new AtomicInteger());
        IdGenerator generator = new IdGenerator(jdbc);
        generator.init();
        try {
            verify(jdbc, atLeastOnce()).queryForObject(anyString(), any(RowMapper.class),
                    anyLong(), anyString(), anyLong(), eq(MAX_40_BIT_ID), anyLong());
        } finally {
            generator.destroy();
        }
    }

    @Test
    @DisplayName("Exhausting the 40-bit space raises a clear error")
    void exhaustionRaisesClearError() {
        AtomicInteger calls = new AtomicInteger();
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForObject(anyString(), any(RowMapper.class),
                anyLong(), anyString(), anyLong(), anyLong(), anyLong()))
                .thenAnswer(invocation -> {
                    int n = calls.incrementAndGet();
                    if (n == 1) {
                        return range(MAX_40_BIT_ID - 39_999L);
                    }
                    if (n == 2) {
                        return range(MAX_40_BIT_ID - 29_999L);
                    }
                    throw new EmptyResultDataAccessException(1);
                });

        IdGenerator generator = new IdGenerator(jdbc);
        generator.init();
        try {
            for (int i = 0; i < 20_000; i++) {
                generator.nextId();
            }
            assertThatThrownBy(generator::nextId)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("Maximum 40-bit ID limit reached");
        } finally {
            generator.destroy();
        }
    }
}