package com.pt.pathio.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.domain.Persistable;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "urls",
        indexes = {
                @Index(name = "idx_short_code", columnList = "shortCode")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class UrlEntity implements Persistable<Long> {

    @Id
    private Long id;

    @Column(nullable = false, length = 2048)
    private String longUrl;

    @Column(nullable = false, unique = true, length = 32)
    private String shortCode;

    @Column(nullable = false)
    @Builder.Default
    private long clickCount = 0;

    /**
     * Owning user's id, or {@code null} for legacy anonymous links. Stored as a plain identifier
     * (no JPA association) so the link module has no compile-time dependency on auth entities; the
     * database-level foreign key into {@code users} was dropped in V10 for the same reason.
     */
    @Column(name = "user_id")
    private UUID userId;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Transient
    @Builder.Default
    private boolean isNew = true;

    @Override
    public boolean isNew() {
        return isNew || createdAt == null;
    }

    @PostPersist
    @PostLoad
    void markNotNew() {
        this.isNew = false;
    }
}
