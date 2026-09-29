package com.pt.pathio.listener;

import com.pt.pathio.event.UrlClickedEvent;
import com.pt.pathio.repository.UrlRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class UrlAnalyticsListener {

    private final StringRedisTemplate redisTemplate;
    private final UrlRepository urlRepository;

    private static final String CLICK_COUNT_KEY_PREFIX = "url:clicks:";
    private static final String DIRTY_CODES_KEY = "url:dirty_codes";

    @Async
    @EventListener
    public void handleUrlClicked(UrlClickedEvent event) {
        try {
            String shortCode = event.getShortCode();
            String countKey = CLICK_COUNT_KEY_PREFIX + shortCode;

            // 1. Increment click count atomically in Redis (In-memory, blazing fast)
            redisTemplate.opsForValue().increment(countKey);

            // 2. Track that this shortCode has pending DB updates
            redisTemplate.opsForSet().add(DIRTY_CODES_KEY, shortCode);

        } catch (Exception e) {
            log.error("Failed to buffer click event for short code: {}", event.getShortCode(), e);
        }
    }

    @Scheduled(fixedRate = 30000) // Runs every 30 seconds
    @Transactional
    public void flushClickCountsToDb() {
        try {
            // Retrieve all short codes that have pending clicks
            Set<String> dirtyCodes = redisTemplate.opsForSet().members(DIRTY_CODES_KEY);
            if (dirtyCodes == null || dirtyCodes.isEmpty()) {
                return;
            }

            // Remove the tracking set so we process a clean batch
            redisTemplate.delete(DIRTY_CODES_KEY);

            for (String shortCode : dirtyCodes) {
                String countKey = CLICK_COUNT_KEY_PREFIX + shortCode;
                String countStr = redisTemplate.opsForValue().get(countKey);

                if (countStr != null) {
                    long clicksToAdd = Long.parseLong(countStr);

                    // Clear the counter key from Redis
                    redisTemplate.delete(countKey);

                    // Update database with the accumulated batch count
                    urlRepository.findByShortCode(shortCode).ifPresent(urlEntity -> {
                        urlEntity.setClickCount(urlEntity.getClickCount() + clicksToAdd);
                        urlRepository.save(urlEntity);
                    });
                }
            }

            log.info("Successfully flushed click analytics for {} URLs to the database.", dirtyCodes.size());

        } catch (Exception e) {
            log.error("Error during scheduled click analytics flush to DB", e);
        }
    }
}