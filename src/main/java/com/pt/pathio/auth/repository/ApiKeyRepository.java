package com.pt.pathio.auth.repository;

import com.pt.pathio.auth.entity.ApiKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApiKeyRepository extends JpaRepository<ApiKey, Long> {

    /**
     * Authentication lookup. Loads the owning user with the key so the filter can resolve the
     * principal without a detached-entity lazy access (the entity is read in its own transaction).
     * key_hash is unique, so the hit is a single index lookup.
     */
    @Query("SELECT a FROM ApiKey a JOIN FETCH a.user WHERE a.keyHash = :keyHash")
    Optional<ApiKey> findByKeyHashWithUser(@Param("keyHash") String keyHash);

    List<ApiKey> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /** Fire-and-forget usage stamp; fails silently when the key died between lookup and write. */
    @Modifying
    @Query("UPDATE ApiKey a SET a.lastUsedAt = :now WHERE a.id = :id")
    int updateLastUsed(@Param("id") Long id, @Param("now") Instant now);
}