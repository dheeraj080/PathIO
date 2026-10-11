package com.pt.pathio.listener;

import com.pt.pathio.event.UrlClickedEvent;
import com.pt.pathio.metrics.PathioMetrics;
import com.pt.pathio.repository.ClickBreakdownRepository;
import com.pt.pathio.repository.ClickRollupRepository;
import com.pt.pathio.repository.UrlRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

@Slf4j
@Component
@RequiredArgsConstructor
public class UrlAnalyticsListener {

    private final StringRedisTemplate redisTemplate;
    private final UrlRepository urlRepository;
    private final ClickRollupRepository clickRollupRepository;
    private final ClickBreakdownRepository clickBreakdownRepository;
    private final PathioMetrics pathioMetrics;

    public static final String PENDING_HASH = "url:pending_clicks";
    private static final String PROCESSING_HASH = "url:pending_clicks:processing";

    public static final String PENDING_DAILY_INDEX = "url:pending_daily_days";
    public static final String PENDING_BREAKDOWN_INDEX = "url:pending_breakdown_days";
    private static final String PENDING_DAILY_PREFIX = "url:pending_daily:";
    private static final String PENDING_BREAKDOWN_PREFIX = "url:pending_breakdown:";
    private static final String PROCESSING_SUFFIX = ":processing";
    private static final String BREAKDOWN_SEPARATOR = "|";

    public static final String DIMENSION_REFERRER = "REFERRER";
    public static final String DIMENSION_DEVICE = "DEVICE";

    /**
     * Atomic pending-to-processing hand-off (RED-03). A single Lua script guarantees exactly one
     * instance owns the {@code processing} key: if the processing key already exists (a live node
     * mid-flush, or a crashed node's leftover batch that the retry-first path will pick up) the
     * script reports 'not swapped' instead of raising a RENAME error, so concurrent flushers never
     * crash one another and a stuck batch is never orphaned.
     */
    private static final String DRAIN_LUA = """
            if redis.call('EXISTS', KEYS[2]) == 1 then
                return 0
            end
            if redis.call('EXISTS', KEYS[1]) == 1 then
                redis.call('RENAME', KEYS[1], KEYS[2])
                return 1
            end
            return 0
            """;

    private static final Duration PENDING_KEY_TTL = Duration.ofDays(3);
    /** Slightly longer than the pending-key TTL so the index outlives the keys it references. */
    private static final Duration PENDING_INDEX_TTL = Duration.ofDays(4);

    private final DefaultRedisScript<Long> drainScript =
            new DefaultRedisScript<>(DRAIN_LUA, Long.class);

    @Async
    @EventListener
    public void handleUrlClicked(UrlClickedEvent event) {
        try {
            LocalDate date = event.occurredAt() == null
                    ? LocalDate.now(ZoneOffset.UTC)
                    : LocalDate.ofInstant(event.occurredAt(), ZoneOffset.UTC);

            redisTemplate.opsForHash().increment(PENDING_HASH, event.shortCode(), 1);

            String dailyKey = PENDING_DAILY_PREFIX + date;
            redisTemplate.opsForHash().increment(dailyKey, event.shortCode(), 1);
            redisTemplate.expire(dailyKey, PENDING_KEY_TTL);
            indexDay(PENDING_DAILY_INDEX, date);

            incrementBreakdown(date, event.shortCode(), DIMENSION_REFERRER, normalizeReferrer(event.referrer()));
            incrementBreakdown(date, event.shortCode(), DIMENSION_DEVICE, deviceType(event.userAgent()));
        } catch (Exception e) {
            log.error("Failed to buffer click event for short code: {}", event.shortCode(), e);
        }
    }

    private void incrementBreakdown(LocalDate date, String shortCode, String dimension, String value) {
        String key = PENDING_BREAKDOWN_PREFIX + date;
        String field = shortCode + BREAKDOWN_SEPARATOR + dimension + BREAKDOWN_SEPARATOR + value;
        redisTemplate.opsForHash().increment(key, field, 1);
        redisTemplate.expire(key, PENDING_KEY_TTL);
        indexDay(PENDING_BREAKDOWN_INDEX, date);
    }

    /**
     * Registers a pending day in a small SET index. The flush job reads the index (SMEMBERS) to
     * discover which daily/breakdown hashes exist instead of issuing the blocking KEYS command,
     * which is O(keyspace) and unsupported in clustered Redis (RED-02).
     */
    private void indexDay(String indexSet, LocalDate date) {
        redisTemplate.opsForSet().add(indexSet, date.toString());
        redisTemplate.expire(indexSet, PENDING_INDEX_TTL);
    }

    @Scheduled(fixedRate = 30000)
    @Transactional
    public void flushClickCountsToDb() {
        flushTotalCounts();
        flushDailyRollups();
        flushBreakdowns();
    }

    /**
     * Retry-first, drain-on-empty hand-off. The {@code processing} key may already hold a batch
     * from a crashed node or a previous cycle that failed against PostgreSQL; that batch is
     * processed before any new pending data is promoted, so a transient DB outage never wedges
     * the pipeline permanently (RED-03).
     */
    private void flushTotalCounts() {
        try {
            Map<Object, Object> entries = redisTemplate.opsForHash().entries(PROCESSING_HASH);
            if (entries.isEmpty() && !drain(PENDING_HASH, PROCESSING_HASH)) {
                return;
            }

            entries = redisTemplate.opsForHash().entries(PROCESSING_HASH);
            if (entries.isEmpty()) {
                redisTemplate.delete(PROCESSING_HASH);
                return;
            }

            for (Map.Entry<Object, Object> entry : entries.entrySet()) {
                String shortCode = (String) entry.getKey();
                long clicks = Long.parseLong((String) entry.getValue());
                // Resolve the owning URL at flush time. If it was deleted (or the alias was
                // re-registered by another user), the buffered clicks are dropped: they belong
                // to an URL that no longer exists and must never land on a reused alias (DB-01).
                urlRepository.findByShortCode(shortCode).ifPresent(url ->
                        urlRepository.incrementClickCountById(url.getId(), shortCode, clicks));
            }

            redisTemplate.delete(PROCESSING_HASH);
            pathioMetrics.recordFlushedClicks(entries.size());
            log.info("Successfully flushed click analytics for {} URLs to DB.", entries.size());
        } catch (Exception e) {
            log.error("Error during scheduled total click flush to DB", e);
        }
    }

    private void flushDailyRollups() {
        flushPendingCounts(PENDING_DAILY_INDEX, PENDING_DAILY_PREFIX, this::flushDailyRollupEntry);
    }

    private void flushBreakdowns() {
        flushPendingCounts(PENDING_BREAKDOWN_INDEX, PENDING_BREAKDOWN_PREFIX, this::flushBreakdownEntry);
    }

    /**
     * Iterates the day-index (never KEYS) and drains pending hashes day by day, applying the same
     * retry-first hand-off as {@link #flushTotalCounts()} so leftovers, concurrent instances and
     * expired keys are all handled deterministically.
     */
    private void flushPendingCounts(String indexSet, String prefix, PendingHashProcessor processor) {
        Set<String> days = redisTemplate.opsForSet().members(indexSet);
        if (days == null) {
            return;
        }
        for (String day : days) {
            try {
                LocalDate date = LocalDate.parse(day);
                String key = prefix + day;
                String processing = key + PROCESSING_SUFFIX;

                Map<Object, Object> entries = redisTemplate.opsForHash().entries(processing);
                if (entries.isEmpty()) {
                    if (!drain(key, processing)) {
                        // Did not win the hand-off: another live instance then owns 'processing'
                        // and will unindex it, so leave the index alone. If nothing exists at all
                        // (expired source) drop the stale index entry.
                        if (redisTemplate.opsForHash().size(processing) == 0L) {
                            unindexDay(indexSet, day);
                        }
                        continue;
                    }
                    entries = redisTemplate.opsForHash().entries(processing);
                    if (entries.isEmpty()) {
                        redisTemplate.delete(processing);
                        unindexDay(indexSet, day);
                        continue;
                    }
                }

                processor.process(date, entries);
                redisTemplate.delete(processing);
                unindexDay(indexSet, day);
            } catch (Exception e) {
                log.error("Error flushing pending hash {} day={}", prefix, day, e);
            }
        }
    }

    private void unindexDay(String indexSet, String day) {
        try {
            redisTemplate.opsForSet().remove(indexSet, day);
        } catch (Exception e) {
            log.warn("Failed to remove day {} from pending index {}", day, indexSet, e);
        }
    }

    private void flushDailyRollupEntry(LocalDate date, Map<Object, Object> entries) {
        for (Map.Entry<Object, Object> entry : entries.entrySet()) {
            String shortCode = (String) entry.getKey();
            long clicks = Long.parseLong((String) entry.getValue());
            urlRepository.findByShortCode(shortCode).ifPresent(url ->
                    clickRollupRepository.upsert(date, shortCode, url.getId(), clicks));
        }
    }

    private void flushBreakdownEntry(LocalDate date, Map<Object, Object> entries) {
        for (Map.Entry<Object, Object> entry : entries.entrySet()) {
            String[] parts = ((String) entry.getKey()).split(Pattern.quote(BREAKDOWN_SEPARATOR), 3);
            if (parts.length < 3) {
                continue;
            }
            String shortCode = parts[0];
            urlRepository.findByShortCode(shortCode).ifPresent(url ->
                    clickBreakdownRepository.upsert(
                            date, shortCode, url.getId(), parts[1], parts[2],
                            Long.parseLong((String) entry.getValue())));
        }
    }

    private boolean drain(String key, String processing) {
        Long swapped = redisTemplate.execute(drainScript, List.of(key, processing));
        return swapped != null && swapped != 0;
    }

    @FunctionalInterface
    private interface PendingHashProcessor {
        void process(LocalDate date, Map<Object, Object> entries);
    }

    private String normalizeReferrer(String referrer) {
        if (referrer == null || referrer.isBlank()) {
            return "direct";
        }
        try {
            URI uri = new URI(referrer);
            String host = uri.getHost();
            if (host == null || host.isBlank()) {
                return "direct";
            }
            String lower = host.toLowerCase(Locale.ROOT);
            return lower.startsWith("www.") ? lower.substring(4) : lower;
        } catch (Exception e) {
            return "direct";
        }
    }

    private String deviceType(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return "unknown";
        }
        String ua = userAgent.toLowerCase(Locale.ROOT);
        if (ua.contains("bot") || ua.contains("crawler") || ua.contains("spider") || ua.contains("slurp")) {
            return "bot";
        }
        if (ua.contains("ipad") || ua.contains("tablet")) {
            return "tablet";
        }
        if (ua.contains("mobile") || ua.contains("iphone") || ua.contains("android") || ua.contains("ipod")) {
            return "mobile";
        }
        return "desktop";
    }
}