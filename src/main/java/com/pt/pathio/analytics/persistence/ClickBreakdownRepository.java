package com.pt.pathio.analytics.persistence;

import com.pt.pathio.analytics.domain.ClickBreakdownEntity;
import com.pt.pathio.analytics.domain.ClickBreakdownId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ClickBreakdownRepository extends JpaRepository<ClickBreakdownEntity, ClickBreakdownId> {

    /**
     * Upserts a breakdown row for a URL identified by its immutable id, not its reusable short
     * code (DB-01): rows are scoped to the owning URL so an alias reused by another user can never
     * surface a previous owner's breakdown.
     */
    @Modifying
    @Query(value = """
            INSERT INTO click_breakdown (click_date, short_code, url_id, dimension, dimension_value, clicks)
            VALUES (:clickDate, :shortCode, :urlId, :dimension, :dimensionValue, :clicks)
            ON CONFLICT (click_date, short_code, dimension, dimension_value)
            DO UPDATE SET clicks = click_breakdown.clicks + EXCLUDED.clicks
            """, nativeQuery = true)
    int upsert(@Param("clickDate") LocalDate clickDate,
               @Param("shortCode") String shortCode,
               @Param("urlId") Long urlId,
               @Param("dimension") String dimension,
               @Param("dimensionValue") String dimensionValue,
               @Param("clicks") long clicks);

    @Query("""
            SELECT c FROM ClickBreakdownEntity c
            WHERE c.urlId = :urlId AND c.id.dimension = :dimension AND c.id.clickDate >= :from
            ORDER BY c.clicks DESC
            """)
    List<ClickBreakdownEntity> findBreakdown(@Param("urlId") Long urlId,
                                             @Param("dimension") String dimension,
                                             @Param("from") LocalDate from);

    /**
     * Breakdown totals (referrers/devices) across every URL owned by {@code ownerId}, so the
     * analytics module can build all-links referrer and device totals without reaching into the
     * link module's persistence. Rows are scoped through {@code urls.user_id}.
     */
    @Query(value = """
            SELECT c.dimension_value AS dimensionValue, SUM(c.clicks) AS clicks
            FROM click_breakdown c
            WHERE c.url_id IN (SELECT u.id FROM urls u WHERE u.user_id = :ownerId)
              AND c.dimension = :dimension
              AND c.click_date >= :from
            GROUP BY c.dimension_value
            ORDER BY SUM(c.clicks) DESC
            """, nativeQuery = true)
    List<Object[]> findBreakdownByOwner(@Param("ownerId") UUID ownerId,
                                        @Param("dimension") String dimension,
                                        @Param("from") LocalDate from);
}