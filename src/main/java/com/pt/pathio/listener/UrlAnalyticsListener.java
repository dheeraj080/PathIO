package com.pt.pathio.listener;

import com.pt.pathio.event.UrlClickedEvent;
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

import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class UrlAnalyticsListener {

    private final StringRedisTemplate redisTemplate;
    private final UrlRepository urlRepository;

    private static final String PENDING_HASH = "url:pending_clicks";
    private static final String PROCESSING_HASH = "url:pending_clicks:processing";

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
            // Modern Record accessor syntax: event.shortCode()
            redisTemplate.opsForHash().increment(PENDING_HASH, event.shortCode(), 1);
        } catch (Exception e) {
            log.error("Failed to buffer click event for short code: {}", event.shortCode(), e);
        }
    }

    @Scheduled(fixedRate = 30000)
    @Transactional
    public void flushClickCountsToDb() {
        try {
            Long swapped = redisTemplate.execute(
                    drainScript,
                    List.of(PENDING_HASH, PROCESSING_HASH)
            );

            if (swapped == null || swapped == 0) {
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
                urlRepository.incrementClickCount(shortCode, clicks);
            }

            redisTemplate.delete(PROCESSING_HASH);
            log.info("Successfully flushed click analytics for {} URLs to DB.", entries.size());

        } catch (Exception e) {
            log.error("Error during scheduled click analytics flush to DB", e);
        }
    }
}