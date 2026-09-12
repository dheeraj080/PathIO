package org.path.link.service;

import io.quarkus.cache.CacheResult;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.path.link.model.ShortLink;
import org.path.link.repository.ShortLinkDao;

import java.time.Instant;
import java.util.Optional;

@ApplicationScoped
public class ShortenerService {

    @Inject
    SnowflakeIdGenerator snowflakeIdGenerator;

    @Inject
    Encoder encoder;

    @Inject
    ShortLinkDao shortLinkDao;

    public ShortLink createShortLink(String originalUrl) {
        long uniqueId = snowflakeIdGenerator.nextId();
        String key = encoder.encode(uniqueId);

        ShortLink link = new ShortLink(
                key,
                originalUrl,
                0L,            // Default anonymous user_id
                "default",      // Default domain
                Instant.now(),
                null,          // No expiration
                true           // Active
        );

        shortLinkDao.save(link);
        return link;
    }

    @CacheResult(cacheName = "urls")
    public Optional<String> getOriginalUrl(String key) {
        return shortLinkDao.findByCode(key)
                .filter(link -> Boolean.TRUE.equals(link.getIsActive()))
                .filter(link -> !link.isExpired())
                .map(ShortLink::getOriginalUrl);
    }
}