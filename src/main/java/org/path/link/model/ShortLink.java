package org.path.link.model;

import com.datastax.oss.driver.api.mapper.annotations.CqlName;
import com.datastax.oss.driver.api.mapper.annotations.Entity;
import com.datastax.oss.driver.api.mapper.annotations.PartitionKey;

import java.time.Instant;

@Entity
@CqlName("short_urls")
public class ShortLink {

    @PartitionKey
    @CqlName("short_code")
    private String shortCode;

    @CqlName("original_url")
    private String originalUrl;

    @CqlName("user_id")
    private Long userId;

    @CqlName("domain")
    private String domain;

    @CqlName("created_at")
    private Instant createdAt;

    @CqlName("expires_at")
    private Instant expiresAt;

    @CqlName("is_active")
    private Boolean isActive;

    public ShortLink() {}

    public ShortLink(String shortCode, String originalUrl, Long userId, String domain, Instant createdAt, Instant expiresAt, Boolean isActive) {
        this.shortCode = shortCode;
        this.originalUrl = originalUrl;
        this.userId = userId;
        this.domain = domain;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.isActive = isActive;
    }

    public String getShortCode() { return shortCode; }
    public void setShortCode(String shortCode) { this.shortCode = shortCode; }

    public String getOriginalUrl() { return originalUrl; }
    public void setOriginalUrl(String originalUrl) { this.originalUrl = originalUrl; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getDomain() { return domain; }
    public void setDomain(String domain) { this.domain = domain; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public boolean isExpired() {
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }
}