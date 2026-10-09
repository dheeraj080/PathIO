package com.pt.pathio.service;

import com.pt.pathio.dto.AnalyticsOverviewResponse;
import com.pt.pathio.dto.UrlAnalyticsResponse;
import com.pt.pathio.entity.UrlEntity;
import com.pt.pathio.exception.ResourceNotFoundException;
import com.pt.pathio.repository.UrlRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UrlAnalyticsService {

    private final UrlRepository urlRepository;
    private final StringRedisTemplate redisTemplate;

    @Value("${app.shortener.domain:https://path.io/}")
    private String domain;

    private static final String PENDING_HASH = "url:pending_clicks";

    public UrlAnalyticsResponse getUrlAnalytics(String shortCode, UUID userId) {
        UrlEntity urlEntity = urlRepository.findByShortCode(shortCode)
                .orElseThrow(() -> new ResourceNotFoundException("URL not found for short code: " + shortCode));

        // Ownership enforcement: Do not leak analytics or existence of URLs belonging to other users or anonymous
        if (urlEntity.getUser() == null || !urlEntity.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("URL not found for short code: " + shortCode);
        }

        long pendingClicks = 0;
        try {
            Object pending = redisTemplate.opsForHash().get(PENDING_HASH, shortCode);
            if (pending != null) {
                pendingClicks = Long.parseLong(pending.toString());
            }
        } catch (Exception e) {
            log.warn("Failed to read pending clicks from Redis for {}", shortCode, e);
        }

        long totalClicks = urlEntity.getClickCount() + pendingClicks;
        String baseUrl = domain.endsWith("/") ? domain : domain + "/";

        return new UrlAnalyticsResponse(
                urlEntity.getShortCode(),
                baseUrl + urlEntity.getShortCode(),
                urlEntity.getLongUrl(),
                totalClicks,
                urlEntity.getCreatedAt()
        );
    }

    public AnalyticsOverviewResponse getOverview(UUID userId) {
        long totalUrls = urlRepository.countByUserId(userId);
        long totalClicks = urlRepository.sumClicksByUserId(userId);
        return new AnalyticsOverviewResponse(totalUrls, totalClicks);
    }
}
