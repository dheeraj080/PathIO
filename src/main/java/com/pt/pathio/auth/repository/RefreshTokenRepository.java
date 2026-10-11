package com.pt.pathio.auth.repository;

import com.pt.pathio.auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {

    Optional<RefreshToken> findByJti(String jti);

    @Query("SELECT rt FROM RefreshToken rt JOIN FETCH rt.user WHERE rt.jti = :jti")
    Optional<RefreshToken> findByJtiWithUser(@Param("jti") String jti);

    @Modifying
    @Query("DELETE FROM RefreshToken rt WHERE rt.expiresAt < :cutoff")
    void deleteExpiredBefore(@Param("cutoff") Instant cutoff);

    /**
     * Atomically consumes a refresh token during rotation: only the request that flips the row
     * from {@code revoked=false} to {@code revoked=true} wins. Returns the number of rows updated
     * (1 on success, 0 when a concurrent request already consumed the same token).
     */
    @Modifying
    @Query("""
            UPDATE RefreshToken rt
               SET rt.revoked = true,
                   rt.replacedByToken = :newJti,
                   rt.revokedAt = :now
             WHERE rt.jti = :jti
               AND rt.revoked = false
            """)
    int rotate(@Param("jti") String jti, @Param("newJti") String newJti, @Param("now") Instant now);

    /**
     * Revokes every non-revoked token that shares the given family (replay escalation).
     */
    @Modifying
    @Query("""
            UPDATE RefreshToken rt
               SET rt.revoked = true, rt.revokedAt = :now
             WHERE rt.familyId = :familyId
               AND rt.revoked = false
            """)
    int revokeFamily(@Param("familyId") UUID familyId, @Param("now") Instant now);

    @Modifying
    @Query("""
            UPDATE RefreshToken rt
               SET rt.revoked = true, rt.revokedAt = :now
             WHERE rt.user.id = :userId
               AND rt.revoked = false
            """)
    int revokeAllForUser(@Param("userId") UUID userId, @Param("now") Instant now);
}