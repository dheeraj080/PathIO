package org.path.link;

import io.quarkus.cache.CacheResult;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.persistence.PersistenceException;
import jakarta.transaction.Transactional;
import org.hibernate.exception.ConstraintViolationException;

import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

@ApplicationScoped
public class ShortenerService {

    @Inject
    SnowflakeIdGenerator snowflakeIdGenerator;

    @Inject
    Encoder encoder;


    @Transactional
    public ShortLink createShortLink(String originalUrl) {
        long uniqueId = snowflakeIdGenerator.nextId();
        String key = encoder.encode(uniqueId);

        ShortLink link = new ShortLink();
        link.originalUrl = originalUrl;
        link.key = key;

        link.persist();  // Direct persist, zero retry overhead required
        return link;
    }

    @CacheResult(cacheName = "urls")
    public Optional<String> getOriginalUrl(String key) {
        return ShortLink.findByKey(key)
                .filter(link -> !link.isExpired())
                .map(link -> link.originalUrl);
    }


}