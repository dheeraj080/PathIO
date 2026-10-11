package com.pt.pathio.analytics.listener;

import com.pt.pathio.link.api.UrlClickedEvent;
import com.pt.pathio.link.api.LinkLookup;
import com.pt.pathio.link.api.LinkRef;
import com.pt.pathio.shared.metrics.PathioMetrics;
import com.pt.pathio.analytics.persistence.ClickBreakdownRepository;
import com.pt.pathio.analytics.persistence.ClickRollupRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
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
 * Headless tests for {@link UrlAnalyticsListener} buffer-to-DB flush semantics.
 *
 * <p>Covers the Phase 4 robustness contract: buffered clicks are resolved to the owning URL's
 * immutable id at flush time (DB-01), pending days are discovered through a small SET index rather
 * than the blocking KEYS command (RED-02), and a {@code processing} batch left behind by a crashed
 * or failed flusher is retried (RED-03).</p>
 */
class UrlAnalyticsListenerTest {

    private StringRedisTemplate redisTemplate;
    private LinkLookup linkLookup;
    private ClickRollupRepository rollupRepository;
    private ClickBreakdownRepository breakdownRepository;
    private UrlAnalyticsListener listener;
    private HashOperations<String, Object, Object> hashOps;
    private SetOperations<String, String> setOps;

    private static final LocalDate TODAY = LocalDate.now(ZoneOffset.UTC);

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        redisTemplate = mock(StringRedisTemplate.class);
        linkLookup = mock(LinkLookup.class);
        rollupRepository = mock(ClickRollupRepository.class);
        breakdownRepository = mock(ClickBreakdownRepository.class);
        hashOps = mock(HashOperations.class);
        setOps = mock(SetOperations.class);

        when(redisTemplate.opsForHash()).thenReturn((HashOperations) hashOps);
        when(redisTemplate.opsForSet()).thenReturn((SetOperations) setOps);
        when(redisTemplate.execute(any(RedisScript.class), anyList())).thenReturn(1L);
        when(hashOps.entries(anyString())).thenReturn(Map.of());
        when(hashOps.size(anyString())).thenReturn(0L);
        when(setOps.members(anyString())).thenReturn(Set.of());

        listener = new UrlAnalyticsListener(
                redisTemplate, linkLookup, rollupRepository, breakdownRepository, mock(PathioMetrics.class));
    }

    private LinkRef ref(Long id, String code) {
        return new LinkRef(id, code, "https://example.com", 0L, null, null);
    }

    @Test
    @DisplayName("Daily rollups drain the pending day and upsert by the owning URL id")
    void flushDailyRollupsDrainsAndUpsertsByUrlId() {
        String code = "abc123";
        String processing = "url:pending_daily:" + TODAY + ":processing";
        when(setOps.members(UrlAnalyticsListener.PENDING_DAILY_INDEX)).thenReturn(Set.of(TODAY.toString()));
        when(hashOps.entries(processing)).thenReturn(Map.of(), Map.of(code, "5"));
        when(linkLookup.findByShortCode(code)).thenReturn(Optional.of(ref(123L, code)));

        listener.flushClickCountsToDb();

        verify(rollupRepository).upsert(TODAY, code, 123L, 5L);
        verify(redisTemplate).delete(processing);
        verify(setOps).remove(UrlAnalyticsListener.PENDING_DAILY_INDEX, TODAY.toString());
    }

    @Test
    @DisplayName("Buffered clicks for a deleted URL are dropped and never written to a reused alias")
    void flushDailyRollupsSkipsDeletedUrl() {
        String code = "abc123";
        String processing = "url:pending_daily:" + TODAY + ":processing";
        when(setOps.members(UrlAnalyticsListener.PENDING_DAILY_INDEX)).thenReturn(Set.of(TODAY.toString()));
        when(hashOps.entries(processing)).thenReturn(Map.of(), Map.of(code, "5"));
        when(linkLookup.findByShortCode(code)).thenReturn(Optional.empty());

        listener.flushClickCountsToDb();

        verify(rollupRepository, never()).upsert(any(), anyString(), any(), anyLong());
        verify(setOps).remove(UrlAnalyticsListener.PENDING_DAILY_INDEX, TODAY.toString());
    }

    @Test
    @DisplayName("A processing batch left by a crashed flusher is retried without a new drain")
    void flushDailyRollupsRetriesLeftoverProcessing() {
        String code = "abc123";
        String processing = "url:pending_daily:" + TODAY + ":processing";
        when(setOps.members(UrlAnalyticsListener.PENDING_DAILY_INDEX)).thenReturn(Set.of(TODAY.toString()));
        // Non-empty on the very first read == leftover from a prior cycle.
        when(hashOps.entries(processing)).thenReturn(Map.of(code, "7"));
        when(linkLookup.findByShortCode(code)).thenReturn(Optional.of(ref(123L, code)));

        listener.flushClickCountsToDb();

        verify(rollupRepository).upsert(TODAY, code, 123L, 7L);
    }

    @Test
    @DisplayName("Breakdown rows drain and upsert by the owning URL id")
    void flushBreakdownsUsesUrlId() {
        String code = "abc123";
        String processing = "url:pending_breakdown:" + TODAY + ":processing";
        when(setOps.members(UrlAnalyticsListener.PENDING_BREAKDOWN_INDEX)).thenReturn(Set.of(TODAY.toString()));
        when(hashOps.entries(processing))
                .thenReturn(Map.of(), Map.of(code + "|REFERRER|news.example.com", "2"));
        when(linkLookup.findByShortCode(code)).thenReturn(Optional.of(ref(123L, code)));

        listener.flushClickCountsToDb();

        verify(breakdownRepository).upsert(TODAY, code, 123L, "REFERRER", "news.example.com", 2L);
        verify(setOps).remove(UrlAnalyticsListener.PENDING_BREAKDOWN_INDEX, TODAY.toString());
    }

    @Test
    @DisplayName("Total click flush increments by URL id and drops clicks for deleted URLs")
    void flushTotalsUsesUrlIdAndSkipsDeleted() {
        when(hashOps.entries(UrlAnalyticsListener.PENDING_HASH + ":processing"))
                .thenReturn(Map.of(), Map.of("exists", "2", "gone", "9"));
        when(linkLookup.findByShortCode("exists")).thenReturn(Optional.of(ref(7L, "exists")));
        when(linkLookup.findByShortCode("gone")).thenReturn(Optional.empty());

        listener.flushClickCountsToDb();

        verify(linkLookup).incrementClicks(7L, "exists", 2L);
        verify(linkLookup, never()).incrementClicks(any(), eq("gone"), anyLong());
    }

    @Test
    @DisplayName("Losing the hand-off to another instance leaves the batch and its index intact")
    void flushLeavesBatchWhenAnotherInstanceOwnsProcessing() {
        String processing = "url:pending_daily:" + TODAY + ":processing";
        when(setOps.members(UrlAnalyticsListener.PENDING_DAILY_INDEX)).thenReturn(Set.of(TODAY.toString()));
        when(redisTemplate.execute(any(RedisScript.class), anyList())).thenReturn(0L);
        when(hashOps.size(processing)).thenReturn(1L);

        listener.flushClickCountsToDb();

        verify(rollupRepository, never()).upsert(any(), anyString(), any(), anyLong());
        verify(setOps, never()).remove(eq(UrlAnalyticsListener.PENDING_DAILY_INDEX), anyString());
    }

    @Test
    @DisplayName("Buffering a click registers the pending day in the index (no KEYS scan)")
    void handleUrlClickedIndexesPendingDays() {
        String code = "abc123";
        listener.handleUrlClicked(new UrlClickedEvent(
                code, "https://news.example.com", "curl/8.0", Instant.now()));

        verify(hashOps).increment(UrlAnalyticsListener.PENDING_HASH, code, 1);
        verify(setOps).add(UrlAnalyticsListener.PENDING_DAILY_INDEX, TODAY.toString());
        // Referrer and device breakdowns each register the day, so the set-add is idempotent.
        verify(setOps, org.mockito.Mockito.times(2))
                .add(UrlAnalyticsListener.PENDING_BREAKDOWN_INDEX, TODAY.toString());
    }
}