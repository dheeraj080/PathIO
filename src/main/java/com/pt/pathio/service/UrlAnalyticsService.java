package com.pt.pathio.service;

import com.pt.pathio.dto.AnalyticsOverviewResponse;
import com.pt.pathio.dto.ClickBreakdownResponse;
import com.pt.pathio.dto.ClickHistoryPoint;
import com.pt.pathio.dto.UrlAnalyticsResponse;
import com.pt.pathio.entity.ClickBreakdownEntity;
import com.pt.pathio.entity.ClickRollupEntity;
import com.pt.pathio.entity.UrlEntity;
import com.pt.pathio.exception.ResourceNotFoundException;
import com.pt.pathio.listener.UrlAnalyticsListener;
import com.pt.pathio.repository.ClickBreakdownRepository;
import com.pt.pathio.repository.ClickRollupRepository;
import com.pt.pathio.repository.UrlRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class UrlAnalyticsService {

    private final UrlRepository urlRepository;
    private final ClickRollupRepository clickRollupRepository;
    private final ClickBreakdownRepository clickBreakdownRepository;
    private final StringRedisTemplate redisTemplate;

    @Value("${app.shortener.domain:https://path.io/}")
    private String domain;

    private static final String PENDING_HASH = "url:pending_clicks";
    private static final String UNIQUE_PREFIX = "url:unique:";
    private static final int MAX_HISTORY_DAYS = 365;

    public UrlAnalyticsResponse getUrlAnalytics(String shortCode, UUID userId) {
        UrlEntity urlEntity = requireOwnedUrl(shortCode, userId);

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
                uniqueClicks(shortCode),
                urlEntity.getCreatedAt()
        );
    }

    public List<ClickHistoryPoint> getClickHistory(String shortCode, UUID userId, int days) {
        requireOwnedUrl(shortCode, userId);

        int window = normalizeDays(days);
        LocalDate today = LocalDate.now(java.time.ZoneOffset.UTC);
        LocalDate from = today.minusDays(window - 1L);

        Map<LocalDate, Long> countsByDate = new HashMap<>();
        for (ClickRollupEntity row : clickRollupRepository.findHistory(shortCode, from)) {
            countsByDate.merge(row.getId().getClickDate(), row.getClicks(), Long::sum);
        }

        List<ClickHistoryPoint> series = new ArrayList<>(window);
        for (LocalDate date = from; !date.isAfter(today); date = date.plusDays(1)) {
            series.add(new ClickHistoryPoint(date, countsByDate.getOrDefault(date, 0L)));
        }
        return series;
    }

    public ClickBreakdownResponse getClickBreakdown(String shortCode, UUID userId, int days) {
        requireOwnedUrl(shortCode, userId);

        int window = normalizeDays(days);
        LocalDate from = LocalDate.now(java.time.ZoneOffset.UTC).minusDays(window - 1L);

        return new ClickBreakdownResponse(
                toDimensionCounts(clickBreakdownRepository.findBreakdown(
                        shortCode, UrlAnalyticsListener.DIMENSION_REFERRER, from)),
                toDimensionCounts(clickBreakdownRepository.findBreakdown(
                        shortCode, UrlAnalyticsListener.DIMENSION_DEVICE, from))
        );
    }

    public AnalyticsOverviewResponse getOverview(UUID userId) {
        long totalUrls = urlRepository.countByUserId(userId);
        long totalClicks = urlRepository.sumClicksByUserId(userId);
        return new AnalyticsOverviewResponse(totalUrls, totalClicks);
    }

    private UrlEntity requireOwnedUrl(String shortCode, UUID userId) {
        UrlEntity urlEntity = urlRepository.findByShortCode(shortCode)
                .orElseThrow(() -> new ResourceNotFoundException("URL not found for short code: " + shortCode));

        // Ownership enforcement: Do not leak analytics or existence of URLs belonging to other users
        if (urlEntity.getUser() == null || !urlEntity.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("URL not found for short code: " + shortCode);
        }
        return urlEntity;
    }

    private long uniqueClicks(String shortCode) {
        try {
            Long size = redisTemplate.opsForHyperLogLog().size(UNIQUE_PREFIX + shortCode);
            return size == null ? 0L : size;
        } catch (Exception e) {
            log.warn("Failed to read unique click count for {}", shortCode, e);
            return 0L;
        }
    }

    private List<ClickBreakdownResponse.DimensionCount> toDimensionCounts(List<ClickBreakdownEntity> rows) {
        Map<String, Long> aggregated = new HashMap<>();
        for (ClickBreakdownEntity row : rows) {
            aggregated.merge(row.getId().getDimensionValue(), row.getClicks(), Long::sum);
        }
        return aggregated.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(e -> new ClickBreakdownResponse.DimensionCount(e.getKey(), e.getValue()))
                .toList();
    }

    private int normalizeDays(int days) {
        if (days < 1) {
            return 1;
        }
        return Math.min(days, MAX_HISTORY_DAYS);
    }
}
