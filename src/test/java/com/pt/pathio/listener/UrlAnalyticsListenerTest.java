package com.pt.pathio.listener;

import com.pt.pathio.entity.UrlEntity;
import com.pt.pathio.metrics.PathioMetrics;
import com.pt.pathio.repository.ClickBreakdownRepository;
import com.pt.pathio.repository.ClickRollupRepository;
import com.pt.pathio.repository.UrlRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Headless tests for {@link UrlAnalyticsListener} buffer-to-DB flush semantics (DB-01): every
 * buffered click is resolved to the owning URL's immutable id at flush time, and buffered clicks
 * whose URL has been deleted are dropped so they can never land on a reused alias.
 */
class UrlAnalyticsListenerTest {

    private StringRedisTemplate redisTemplate;
    private UrlRepository urlRepository;
    private ClickRollupRepository rollupRepository;
    private ClickBreakdownRepository breakdownRepository;
    private UrlAnalyticsListener listener;
    private HashOperations<String, Object, Object> hashOps;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        redisTemplate = mock(StringRedisTemplate.class);
        urlRepository = mock(UrlRepository.class);
        rollupRepository = mock(ClickRollupRepository.class);
        breakdownRepository = mock(ClickBreakdownRepository.class);
        hashOps = mock(HashOperations.class);
        when(redisTemplate.opsForHash()).thenReturn((HashOperations) hashOps);
        when(redisTemplate.execute(any(RedisScript.class), anyList())).thenReturn(1L);
        when(redisTemplate.keys(anyString())).thenReturn(Set.of());
        listener = new UrlAnalyticsListener(
                redisTemplate, urlRepository, rollupRepository, breakdownRepository, mock(PathioMetrics.class));
    }

    private UrlEntity url(Long id, String code) {
        return UrlEntity.builder()
                .id(id)
                .longUrl("https://example.com")
                .shortCode(code)
                .clickCount(0L)
                .build();
    }

    @Test
    @DisplayName("Daily rollups are written for the owning URL id")
    void flushRollupsUsesUrlId() {
        LocalDate today = LocalDate.now();
        String code = "abc123";
        when(redisTemplate.keys("url:pending_daily:*"))
                .thenReturn(Set.of("url:pending_daily:" + today));
        when(hashOps.entries("url:pending_daily:" + today + ":processing"))
                .thenReturn(Map.of(code, "5"));
        when(urlRepository.findByShortCode(code)).thenReturn(Optional.of(url(123L, code)));

        listener.flushClickCountsToDb();

        verify(rollupRepository).upsert(today, code, 123L, 5L);
    }

    @Test
    @DisplayName("Daily rollups upsert by URL id, not by the reusable alias")
    void flushSkipsDeletedUrlFromRollups() {
        LocalDate today = LocalDate.now();
        String code = "abc123";
        when(redisTemplate.keys("url:pending_daily:*"))
                .thenReturn(Set.of("url:pending_daily:" + today));
        when(hashOps.entries("url:pending_daily:" + today + ":processing"))
                .thenReturn(Map.of(code, "5"));
        when(urlRepository.findByShortCode(code)).thenReturn(Optional.empty());

        listener.flushClickCountsToDb();

        verify(rollupRepository, never()).upsert(any(), anyString(), any(), anyLong());
    }

    @Test
    @DisplayName("Breakdown rows are written for the owning URL id")
    void flushBreakdownsUsesUrlId() {
        LocalDate today = LocalDate.now();
        String code = "abc123";
        when(redisTemplate.keys("url:pending_breakdown:*"))
                .thenReturn(Set.of("url:pending_breakdown:" + today));
        when(hashOps.entries("url:pending_breakdown:" + today + ":processing"))
                .thenReturn(Map.of(code + "|REFERRER|news.example.com", "2"));
        when(urlRepository.findByShortCode(code)).thenReturn(Optional.of(url(123L, code)));

        listener.flushClickCountsToDb();

        verify(breakdownRepository).upsert(today, code, 123L, "REFERRER", "news.example.com", 2L);
    }

    @Test
    @DisplayName("Total click flush increments by URL id and drops clicks for deleted URLs")
    void flushTotalsUsesUrlIdAndSkipsDeleted() {
        when(hashOps.entries(UrlAnalyticsListener.PENDING_HASH + ":processing"))
                .thenReturn(Map.of("exists", "2", "gone", "9"));
        when(urlRepository.findByShortCode("exists")).thenReturn(Optional.of(url(7L, "exists")));
        when(urlRepository.findByShortCode("gone")).thenReturn(Optional.empty());

        listener.flushClickCountsToDb();

        verify(urlRepository).incrementClickCountById(7L, "exists", 2L);
        verify(urlRepository, never()).incrementClickCountById(any(), eq("gone"), anyLong());
    }
}