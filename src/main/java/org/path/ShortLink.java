package org.path;

import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.Optional;

@Entity
@Table(name="short_link", indexes ={
        @Index(name= "idx_shortlink_key", columnList = "\"key\"")
})
@Cacheable
public class ShortLink extends PanacheEntity {

    @Column(name = "\"key\"", unique = true, nullable = false, length = 7, updatable = false)
    public String key;

    @Column(nullable = false, length = 2048, updatable = false)
    public String originalUrl;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    public Instant createdAt;

    @Column
    public Instant expiresAt;

    @Column(nullable = false)
    public long clickCount = 0;

    public static Optional<ShortLink> findByKey(String key) {
        return find("key", key).firstResultOptional();
    }

    public boolean isExpired() {  // expity check
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }
}
