package com.pt.pathio.auth.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_token", indexes = {
        @Index(name = "refresh_token_user_id_idx", columnList = "user_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshToken {

    @Id
    @Column(name = "jti", nullable = false, updatable = false, length = 64)
    private String jti;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, updatable = false)
    private User user;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean revoked = false;

    @Column(name = "replaced_by_token", length = 64)
    private String replacedByToken;

    /**
     * Groups every token produced by successive rotations of one login session. A single family id
     * lets a replayed superseded token revoke the whole chain atomically (SEC-05). Populated by
     * {@code V6__refresh_token_family.sql} for existing rows.
     */
    @Column(name = "family_id", nullable = false, updatable = false)
    private UUID familyId;

    @Column(name = "revoked_at")
    private Instant revokedAt;
}