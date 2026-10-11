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
    private static final String PENDING_DAILY_PREFIX = "url:pending_daily:";
    private static final String PENDING_BREAKDOWN_PREFIX = "url:pending_breakdown:";
    private static final String PROCESSING_SUFFIX = ":processing";
    private static final String BREAKDOWN_SEPARATOR = "|";

    public static final String DIMENSION_REFERRER = "REFERRER";
    public static final String DIMENSION_DEVICE = "DEVICE";

    private static final String DRAIN_LUA = """
            if redis.call('EXISTS', KEYS[1]) == 1 then
                redis.call('RENAME', KEYS[1], KEYS[2])
                return 1
            else
                return 0
            end
            """;

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
            redisTemplate.expire(dailyKey, Duration.ofDays(3));

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
        redisTemplate.expire(key, Duration.ofDays(3));
    }

    @Scheduled(fixedRate = 30000)
    @Transactional
    public void flushClickCountsToDb() {
        flushTotalCounts();
        flushDailyRollups();
        flushBreakdowns();
    }

    private void flushTotalCounts() {
        try {
            if (!drain(PENDING_HASH, PROCESSING_HASH)) {
                return;
            }

            Map<Object, Object> entries = redisTemplate.opsForHash().entries(PROCESSING_HASH);
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
        Set<String> keys = redisTemplate.keys(PENDING_DAILY_PREFIX + "*");
        if (keys == null) {
            return;
        }
        for (String key : keys) {
            if (key.endsWith(PROCESSING_SUFFIX)) {
                continue;
            }
            try {
                LocalDate date = LocalDate.parse(key.substring(PENDING_DAILY_PREFIX.length()));
                String processing = key + PROCESSING_SUFFIX;
                if (!drain(key, processing)) {
                    continue;
                }
                Map<Object, Object> entries = redisTemplate.opsForHash().entries(processing);
                for (Map.Entry<Object, Object> entry : entries.entrySet()) {
                    String shortCode = (String) entry.getKey();
                    long clicks = Long.parseLong((String) entry.getValue());
                    urlRepository.findByShortCode(shortCode).ifPresent(url ->
                            clickRollupRepository.upsert(date, shortCode, url.getId(), clicks));
                }
                redisTemplate.delete(processing);
            } catch (Exception e) {
                log.error("Error flushing daily rollup for key {}", key, e);
            }
        }
    }

    private void flushBreakdowns() {
        Set<String> keys = redisTemplate.keys(PENDING_BREAKDOWN_PREFIX + "*");
        if (keys == null) {
            return;
        }
        for (String key : keys) {
            if (key.endsWith(PROCESSING_SUFFIX)) {
                continue;
            }
            try {
                LocalDate date = LocalDate.parse(key.substring(PENDING_BREAKDOWN_PREFIX.length()));
                String processing = key + PROCESSING_SUFFIX;
                if (!drain(key, processing)) {
                    continue;
                }
                Map<Object, Object> entries = redisTemplate.opsForHash().entries(processing);
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
                redisTemplate.delete(processing);
            } catch (Exception e) {
                log.error("Error flushing breakdown for key {}", key, e);
            }
        }
    }

    private boolean drain(String key, String processing) {
        Long swapped = redisTemplate.execute(drainScript, List.of(key, processing));
        return swapped != null && swapped != 0;
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
