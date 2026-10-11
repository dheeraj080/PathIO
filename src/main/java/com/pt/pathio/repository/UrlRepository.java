package com.pt.pathio.repository;

import com.pt.pathio.entity.UrlEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UrlRepository extends JpaRepository<UrlEntity, Long> {

    Optional<UrlEntity> findByShortCode(String shortCode);

    @Modifying
    @Query("UPDATE UrlEntity u SET u.clickCount = u.clickCount + :clicks WHERE u.id = :id AND u.shortCode = :shortCode")
    int incrementClickCountById(@Param("id") Long id,
                                @Param("shortCode") String shortCode,
                                @Param("clicks") long clicks);

    Page<UrlEntity> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);

    Optional<UrlEntity> findByShortCodeAndUserId(String shortCode, UUID userId);

    long countByUserId(UUID userId);

    @Query("SELECT COALESCE(SUM(u.clickCount), 0) FROM UrlEntity u WHERE u.user.id = :userId")
    long sumClicksByUserId(@Param("userId") UUID userId);
}
