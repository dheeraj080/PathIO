package com.pt.pathio.service;

import com.pt.pathio.dto.ShortenUrlRequest;
import com.pt.pathio.dto.ShortenUrlResponse;
import com.pt.pathio.entity.UrlEntity;
import com.pt.pathio.repository.UrlRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UrlShortenerService {

    private final UrlRepository urlRepository;
    private final DistributedIdGenerator distributedIdGenerator;
    private final FeistelObfuscator feistelObfuscator;

    private static final int SHORT_CODE_LENGTH = 7;
    private static final String BASE62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final String DOMAIN = "https://path.io/";

    public ShortenUrlResponse shortenUrl(ShortenUrlRequest request) {

        long rawId = distributedIdGenerator.nextId();
        long obfuscatedId = feistelObfuscator.obfuscate(rawId);
        String shortCode = encodeBase62(obfuscatedId);

        UrlEntity urlEntity = UrlEntity.builder()
                .longUrl(request.getLongUrl())
                .shortCode(shortCode)
                .clickCount(0L)
                .build();

        urlRepository.save(urlEntity);

        String shortUrl = DOMAIN + shortCode;
        return new ShortenUrlResponse(shortUrl, request.getLongUrl());
    }

    @Cacheable(value = "urls", key = "#shortCode")
    public String getOriginalUrl(String shortCode) {
        UrlEntity urlEntity = urlRepository.findByShortCode(shortCode)
                .orElseThrow(() -> new RuntimeException("URL not found for short code: " + shortCode));

        urlEntity.setClickCount(urlEntity.getClickCount() + 1);
        urlRepository.save(urlEntity);

        return urlEntity.getLongUrl();
    }

    private String generateUniqueShortCode() {
        long id = distributedIdGenerator.nextId();
        return encodeBase62(id);
    }

    private String encodeBase62(long value) {
        if (value == 0) {
            return String.valueOf(BASE62.charAt(0)).repeat(SHORT_CODE_LENGTH);
        }

        StringBuilder sb = new StringBuilder();
        while (value > 0) {
            int remainder = (int) (value % 62);
            sb.append(BASE62.charAt(remainder));
            value /= 62;
        }

        if (sb.length() > SHORT_CODE_LENGTH) {
            throw new IllegalStateException("Obfuscated ID exceeded 7-character Base62 limit!");
        }

        while (sb.length() < SHORT_CODE_LENGTH) {
            sb.append(BASE62.charAt(0));
        }

        return sb.reverse().toString();
    }
}
