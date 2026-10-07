package com.pt.pathio.repository;

import com.pt.pathio.entity.UrlEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UrlRepository extends JpaRepository<UrlEntity, Long> {

    Optional<UrlEntity> findByShortCode(String shortCode);

    @Modifying
    @Query("UPDATE UrlEntity u SET u.clickCount = u.clickCount + :clicks WHERE u.shortCode = :shortCode")
    int incrementClickCount(@Param("shortCode") String shortCode, @Param("clicks") long clicks);

}
