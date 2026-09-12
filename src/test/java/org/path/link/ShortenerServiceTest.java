package org.path.link;

import io.quarkus.test.TestTransaction;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.Optional;

@QuarkusTest
public class ShortenerServiceTest {

    @Inject
    ShortenerService service;

    @Test
    @TestTransaction
    public void testCreateShortLinkSuccess() {
        String originalUrl = "https://example.com/very/long/url";
        ShortLink created = service.createShortLink(originalUrl);

        Assertions.assertNotNull(created);
        Assertions.assertNotNull(created.key);
        Assertions.assertEquals(originalUrl, created.originalUrl);
    }

    @Test
    @TestTransaction
    public void testGetOriginalUrl() {
        String originalUrl = "https://quarkus.io";
        ShortLink created = service.createShortLink(originalUrl);

        Optional<String> fetchedUrl = service.getOriginalUrl(created.key);

        Assertions.assertTrue(fetchedUrl.isPresent());
        Assertions.assertEquals(originalUrl, fetchedUrl.get());
    }

    @Test
    public void testGetOriginalUrlNotFound() {
        Optional<String> fetchedUrl = service.getOriginalUrl("nonexistentkey");
        Assertions.assertTrue(fetchedUrl.isEmpty());
    }
}