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

    @Modifying
    @Query(value = """
            INSERT INTO click_rollup (click_date, short_code, clicks)
            VALUES (:clickDate, :shortCode, :clicks)
            ON CONFLICT (click_date, short_code)
            DO UPDATE SET clicks = click_rollup.clicks + EXCLUDED.clicks
            """, nativeQuery = true)
    int upsert(@Param("clickDate") LocalDate clickDate,
               @Param("shortCode") String shortCode,
               @Param("clicks") long clicks);

    @Query("SELECT c FROM ClickRollupEntity c WHERE c.id.shortCode = :shortCode AND c.id.clickDate >= :from ORDER BY c.id.clickDate")
    List<ClickRollupEntity> findHistory(@Param("shortCode") String shortCode, @Param("from") LocalDate from);
}
