package com.pt.pathio.link.app;

import com.pt.pathio.entity.UrlEntity;
import com.pt.pathio.link.api.LinkLookup;
import com.pt.pathio.link.api.LinkRef;
import com.pt.pathio.repository.UrlRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

/**
 * Link-owned implementation of the published {@link LinkLookup} contract. Bridges the JPA
 * persistence layer ({@code UrlRepository}/{@code UrlEntity}) to the immutable {@link LinkRef}
 * views consumed by the analytics module. Internal to the link module: analytics must only ever
 * see the {@code link.api} interface.
 */
@Service
@RequiredArgsConstructor
public class LinkLookupImpl implements LinkLookup {

    private final UrlRepository urlRepository;

    @Override
    @Transactional(readOnly = true)
    public Optional<LinkRef> findByShortCode(String shortCode) {
        return urlRepository.findByShortCode(shortCode).map(this::toRef);
    }

    @Override
    @Transactional
    public int incrementClicks(Long linkId, String shortCode, long clicks) {
        return urlRepository.incrementClickCountById(linkId, shortCode, clicks);
    }

    @Override
    @Transactional(readOnly = true)
    public long countByOwner(UUID ownerId) {
        return urlRepository.countByUserId(ownerId);
    }

    @Override
    @Transactional(readOnly = true)
    public long sumClicksByOwner(UUID ownerId) {
        return urlRepository.sumClicksByUserId(ownerId);
    }

    private LinkRef toRef(UrlEntity entity) {
        return new LinkRef(
                entity.getId(),
                entity.getShortCode(),
                entity.getLongUrl(),
                entity.getClickCount(),
                entity.getCreatedAt(),
                entity.getOwnerId()
        );
    }
}