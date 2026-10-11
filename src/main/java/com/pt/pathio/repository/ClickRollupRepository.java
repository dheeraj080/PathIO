package com.pt.pathio.repository;

import com.pt.pathio.entity.ClickRollupEntity;
import com.pt.pathio.entity.ClickRollupId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

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
}