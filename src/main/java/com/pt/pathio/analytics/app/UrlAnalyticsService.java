package com.pt.pathio.analytics.app;

import com.pt.pathio.analytics.dto.AnalyticsOverviewResponse;
import com.pt.pathio.analytics.dto.ClickBreakdownResponse;
import com.pt.pathio.analytics.dto.ClickHistoryPoint;
import com.pt.pathio.analytics.dto.TopLinkResponse;
import com.pt.pathio.analytics.dto.UrlAnalyticsResponse;
import com.pt.pathio.analytics.domain.ClickBreakdownEntity;
import com.pt.pathio.analytics.domain.ClickRollupEntity;
import com.pt.pathio.link.api.LinkLookup;
import com.pt.pathio.link.api.LinkRef;
import com.pt.pathio.shared.error.ResourceNotFoundException;
import com.pt.pathio.analytics.listener.UrlAnalyticsListener;
import com.pt.pathio.analytics.persistence.ClickBreakdownRepository;
import com.pt.pathio.analytics.persistence.ClickRollupRepository;
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

    private final LinkLookup linkLookup;
    private final ClickRollupRepository clickRollupRepository;
    private final ClickBreakdownRepository clickBreakdownRepository;
    private final StringRedisTemplate redisTemplate;

    @Value("${app.shortener.domain:https://path.io/}")
    private String domain;

    private static final String PENDING_HASH = "url:pending_clicks";
    private static final String UNIQUE_PREFIX = "url:unique:";
    private static final int MAX_HISTORY_DAYS = 365;
    private static final int MAX_TOP_LINKS = 20;

    public UrlAnalyticsResponse getUrlAnalytics(String shortCode, UUID userId) {
        LinkRef link = requireOwnedUrl(shortCode, userId);

        long pendingClicks = 0;
        try {
            Object pending = redisTemplate.opsForHash().get(PENDING_HASH, shortCode);
            if (pending != null) {
                pendingClicks = Long.parseLong(pending.toString());
            }
        } catch (Exception e) {
            log.warn("Failed to read pending clicks from Redis for {}", shortCode, e);
        }

        long totalClicks = link.clickCount() + pendingClicks;
        String baseUrl = domain.endsWith("/") ? domain : domain + "/";

        return new UrlAnalyticsResponse(
                link.shortCode(),
                baseUrl + link.shortCode(),
                link.longUrl(),
                totalClicks,
                uniqueClicks(shortCode),
                link.createdAt()
        );
    }

    public List<ClickHistoryPoint> getClickHistory(String shortCode, UUID userId, int days) {
        LinkRef link = requireOwnedUrl(shortCode, userId);

        int window = normalizeDays(days);
        LocalDate today = LocalDate.now(java.time.ZoneOffset.UTC);
        LocalDate from = today.minusDays(window - 1L);

        Map<LocalDate, Long> countsByDate = new HashMap<>();
        for (ClickRollupEntity row : clickRollupRepository.findHistory(link.id(), from)) {
            countsByDate.merge(row.getId().getClickDate(), row.getClicks(), Long::sum);
        }

        List<ClickHistoryPoint> series = new ArrayList<>(window);
        for (LocalDate date = from; !date.isAfter(today); date = date.plusDays(1)) {
            series.add(new ClickHistoryPoint(date, countsByDate.getOrDefault(date, 0L)));
        }
        return series;
    }

    public ClickBreakdownResponse getClickBreakdown(String shortCode, UUID userId, int days) {
        LinkRef link = requireOwnedUrl(shortCode, userId);

        int window = normalizeDays(days);
        LocalDate from = LocalDate.now(java.time.ZoneOffset.UTC).minusDays(window - 1L);

        return new ClickBreakdownResponse(
                toDimensionCounts(clickBreakdownRepository.findBreakdown(
                        link.id(), UrlAnalyticsListener.DIMENSION_REFERRER, from)),
                toDimensionCounts(clickBreakdownRepository.findBreakdown(
                        link.id(), UrlAnalyticsListener.DIMENSION_DEVICE, from))
        );
    }

    public AnalyticsOverviewResponse getOverview(UUID userId) {
        long totalUrls = linkLookup.countByOwner(userId);
        long totalClicks = linkLookup.sumClicksByOwner(userId);
        return new AnalyticsOverviewResponse(totalUrls, totalClicks);
    }

    /**
     * All-links click timeline: the owner's daily rollup rows are aggregated per date across
     * every one of their URLs, then zero-filled for the requested window (same behaviour as the
     * per-link {@link #getClickHistory}). Only persisted rollups are included, matching overview.
     */
    public List<ClickHistoryPoint> getGlobalHistory(UUID userId, int days) {
        int window = normalizeDays(days);
        LocalDate today = LocalDate.now(java.time.ZoneOffset.UTC);
        LocalDate from = today.minusDays(window - 1L);

        Map<LocalDate, Long> countsByDate = new HashMap<>();
        for (Object[] row : clickRollupRepository.findHistoryByOwner(userId, from)) {
            countsByDate.merge(toLocalDate(row[0]), ((Number) row[1]).longValue(), Long::sum);
        }

        List<ClickHistoryPoint> series = new ArrayList<>(window);
        for (LocalDate date = from; !date.isAfter(today); date = date.plusDays(1)) {
            series.add(new ClickHistoryPoint(date, countsByDate.getOrDefault(date, 0L)));
        }
        return series;
    }

    /** All-links referrer and device breakdown across the owner's URLs, for the requested window. */
    public ClickBreakdownResponse getGlobalBreakdown(UUID userId, int days) {
        int window = normalizeDays(days);
        LocalDate from = LocalDate.now(java.time.ZoneOffset.UTC).minusDays(window - 1L);

        return new ClickBreakdownResponse(
                toAggregatedDimensionCounts(clickBreakdownRepository.findBreakdownByOwner(
                        userId, UrlAnalyticsListener.DIMENSION_REFERRER, from)),
                toAggregatedDimensionCounts(clickBreakdownRepository.findBreakdownByOwner(
                        userId, UrlAnalyticsListener.DIMENSION_DEVICE, from))
        );
    }

    /**
     * The owner's most-clicked links, newest-first ordering aside. Ranking uses the persisted
     * click count (the same source {@link #getOverview} totalClicks is built from), so a fresh
     * click appears once its daily flush lands.
     */
    public List<TopLinkResponse> getTopLinks(UUID userId, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, MAX_TOP_LINKS));
        String baseUrl = domain.endsWith("/") ? domain : domain + "/";
        return linkLookup.findTopByOwner(userId, safeLimit).stream()
                .map(ref -> new TopLinkResponse(
                        ref.shortCode(),
                        baseUrl + ref.shortCode(),
                        ref.longUrl(),
                        ref.clickCount()))
                .toList();
    }

    private LinkRef requireOwnedUrl(String shortCode, UUID userId) {
        LinkRef link = linkLookup.findByShortCode(shortCode)
                .orElseThrow(() -> new ResourceNotFoundException("URL not found for short code: " + shortCode));

        // Ownership enforcement: Do not leak analytics or existence of URLs belonging to other users
        if (link.ownerId() == null || !link.ownerId().equals(userId)) {
            throw new ResourceNotFoundException("URL not found for short code: " + shortCode);
        }
        return link;
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
        return toSortedDimensionCounts(aggregated);
    }

    /** Aggregates native query rows ({@code [dimensionValue, clicks]}) into sorted dimension counts. */
    private List<ClickBreakdownResponse.DimensionCount> toAggregatedDimensionCounts(List<Object[]> rows) {
        Map<String, Long> aggregated = new HashMap<>();
        for (Object[] row : rows) {
            aggregated.merge(row[0].toString(), ((Number) row[1]).longValue(), Long::sum);
        }
        return toSortedDimensionCounts(aggregated);
    }

    private List<ClickBreakdownResponse.DimensionCount> toSortedDimensionCounts(Map<String, Long> aggregated) {
        return aggregated.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(e -> new ClickBreakdownResponse.DimensionCount(e.getKey(), e.getValue()))
                .toList();
    }

    private static LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate date) {
            return date;
        }
        if (value instanceof java.sql.Date date) {
            return date.toLocalDate();
        }
        throw new IllegalArgumentException("Unexpected click date type: " + value.getClass());
    }

    private int normalizeDays(int days) {
        if (days < 1) {
            return 1;
        }
        return Math.min(days, MAX_HISTORY_DAYS);
    }
}
