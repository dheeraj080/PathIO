package com.pt.pathio.analytics.persistence;

import com.pt.pathio.analytics.domain.ClickRollupEntity;
import com.pt.pathio.analytics.domain.ClickRollupId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ClickRollupRepository extends JpaRepository<ClickRollupEntity, ClickRollupId> {

    /**
     * Upserts a daily click rollup for a URL identified by its immutable id, not its reusable
     * short code (DB-01): rows are scoped to the owning URL so an alias reused by another user
     * can never surface a previous owner's history.
     */
    @Modifying
    @Query(value = """
            INSERT INTO click_rollup (click_date, short_code, url_id, clicks)
            VALUES (:clickDate, :shortCode, :urlId, :clicks)
            ON CONFLICT (click_date, short_code)
            DO UPDATE SET clicks = click_rollup.clicks + EXCLUDED.clicks
            """, nativeQuery = true)
    int upsert(@Param("clickDate") LocalDate clickDate,
               @Param("shortCode") String shortCode,
               @Param("urlId") Long urlId,
               @Param("clicks") long clicks);

    @Query("SELECT c FROM ClickRollupEntity c WHERE c.urlId = :urlId AND c.id.clickDate >= :from ORDER BY c.id.clickDate")
    List<ClickRollupEntity> findHistory(@Param("urlId") Long urlId, @Param("from") LocalDate from);

    /**
     * Daily click totals across every URL owned by {@code ownerId}, so the analytics module can
     * build its all-links timeline without reaching into the link module's persistence. Rows are
     * scoped through {@code urls.user_id} so another user's analytics can never leak in.
     */
    @Query(value = """
            SELECT c.click_date AS clickDate, SUM(c.clicks) AS clicks
            FROM click_rollup c
            WHERE c.url_id IN (SELECT u.id FROM urls u WHERE u.user_id = :ownerId)
              AND c.click_date >= :from
            GROUP BY c.click_date
            ORDER BY c.click_date
            """, nativeQuery = true)
    List<Object[]> findHistoryByOwner(@Param("ownerId") UUID ownerId, @Param("from") LocalDate from);
}