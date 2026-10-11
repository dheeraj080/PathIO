package com.pt.pathio.repository;

import com.pt.pathio.entity.ClickBreakdownEntity;
import com.pt.pathio.entity.ClickBreakdownId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

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
}