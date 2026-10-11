package com.pt.pathio.entity;

import com.pt.pathio.auth.entity.User;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

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

    /**
     * The owning user's identifier, or {@code null} for legacy anonymous links. Exposes only the id
     * so link code never has to reference the auth entity.
     */
    public UUID getOwnerId() {
        return user == null ? null : user.getId();
    }

    /**
     * Attaches the owner by identifier without leaking the auth entity to callers. The {@code user}
     * association is still the JPA {@code @ManyToOne} (a later phase replaces it with a scalar
     * {@code userId}); only the primary key is needed to write the foreign key on insert.
     */
    public void setOwnerId(UUID ownerId) {
        this.user = ownerId == null ? null : User.builder().id(ownerId).build();
    }
}
