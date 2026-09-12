package org.path.link;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.path.link.model.ShortLink;
import org.path.link.repository.ShortLinkDao;
import org.path.link.service.ShortenerService;

import java.util.Optional;

@QuarkusTest
public class ShortenerServiceTest {

    @Inject
    ShortenerService service;

    @Inject
    ShortLinkDao dao;

    @Test
    @DisplayName("Should create short link, persist to Cassandra, and retrieve original URL")
    void testCreateAndRetrieveLink() {
        String originalUrl = "https://example.com/very-long-path";

        // 1. Create short link
        ShortLink link = service.createShortLink(originalUrl);

        Assertions.assertNotNull(link);
        Assertions.assertNotNull(link.getShortCode());
        Assertions.assertEquals(7, link.getShortCode().length(), "Short code must be exactly 7 characters");
        Assertions.assertEquals(originalUrl, link.getOriginalUrl());
        Assertions.assertTrue(link.getIsActive());

        // 2. Fetch directly from DAO to confirm persistence
        Optional<ShortLink> persisted = dao.findByCode(link.getShortCode());
        Assertions.assertTrue(persisted.isPresent());
        Assertions.assertEquals(originalUrl, persisted.get().getOriginalUrl());

        // 3. Fetch via Service (Tests caching & filter flags)
        Optional<String> fetchedUrl = service.getOriginalUrl(link.getShortCode());
        Assertions.assertTrue(fetchedUrl.isPresent());
        Assertions.assertEquals(originalUrl, fetchedUrl.get());
    }

    @Test
    @DisplayName("Should return empty Optional for inactive or non-existent links")
    void testInactiveLinkHandling() {
        // Test non-existent key
        Optional<String> nonExistent = service.getOriginalUrl("nonexistent");
        Assertions.assertFalse(nonExistent.isPresent());

        // Test inactive key
        ShortLink link = service.createShortLink("https://example.com/deactivated");
        link.setIsActive(false);
        dao.save(link); // Update in Cassandra

        Optional<String> inactiveResult = service.getOriginalUrl(link.getShortCode());
        Assertions.assertFalse(inactiveResult.isPresent());
    }
}