package org.path;

import io.quarkus.cache.CacheResult;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.persistence.PersistenceException;
import jakarta.transaction.Transactional;
import org.hibernate.exception.ConstraintViolationException;

import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

@ApplicationScoped
public class ShortenerService {

    private static final char[] B62ENCODING = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".toCharArray();
    private static final int KEY_LENGTH = 7;
    private static final int MAX_RETRIES = 5;

    @Transactional
    public ShortLink createShortLink(String originalUrl) {
        int attempts = 0;

        while (attempts < MAX_RETRIES) {
            String key = generateKey();

            ShortLink link = new ShortLink();
            link.originalUrl = originalUrl;
            link.key = key;

            try {
                link.persistAndFlush();
                return link;
            } catch (PersistenceException e) {
                if (isUniqueConstraintViolation(e)) {
                    attempts++;
                } else {
                    // Rethrow immediately if it's a non-retryable database failure (e.g., connection issue, bad column format)
                    throw e;
                }
            }
        }

        throw new IllegalStateException("Failed to generate a unique short key after " + MAX_RETRIES + " attempts");
    }

    @CacheResult(cacheName = "urls")
    public Optional<String> getOriginalUrl(String key) {
        return ShortLink.findByKey(key)
                .map(link -> link.originalUrl);
    }

    private boolean isUniqueConstraintViolation(Throwable throwable) {
        Throwable cause = throwable;
        while (cause != null) {
            if (cause instanceof ConstraintViolationException) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }

    private String generateKey() {
        char[] result = new char[KEY_LENGTH];
        ThreadLocalRandom random = ThreadLocalRandom.current();

        for (int i = 0; i < KEY_LENGTH; i++) {
            result[i] = B62ENCODING[random.nextInt(B62ENCODING.length)];
        }
        return new String(result);
    }
}