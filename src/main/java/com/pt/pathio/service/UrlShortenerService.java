package com.pt.pathio.service;

import com.pt.pathio.dto.ShortenUrlRequest;
import com.pt.pathio.dto.ShortenUrlResponse;
import com.pt.pathio.entity.UrlEntity;
import com.pt.pathio.repository.UrlRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

@Service
@RequiredArgsConstructor
public class UrlShortenerService {

    private final UrlRepository urlRepository;

    private static final int SHORT_CODE_LENGTH = 7;
    private static final String BASE62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final String DOMAIN = "https://path.io/";
    private static final SecureRandom RANDOM = new SecureRandom();

    public ShortenUrlResponse shortenUrl(ShortenUrlRequest request) {
        String shortCode = generateUniqueShortCode();

        UrlEntity urlEntity = UrlEntity.builder()
                .longUrl(request.getLongUrl())
                .shortCode(shortCode)
                .build();

        urlRepository.save(urlEntity);

        String baseDomain = DOMAIN;
        String shortUrl = baseDomain + shortCode;

        return new ShortenUrlResponse(shortUrl, request.getLongUrl());
    }

    public String getOriginalUrl(String shortCode) {
        UrlEntity urlEntity = urlRepository.findByShortCode(shortCode)
                .orElseThrow(() -> new RuntimeException("URL not found for shor code: " + shortCode));

        urlEntity.setClickCount(urlEntity.getClickCount() + 1);
        urlRepository.save(urlEntity);

        return urlEntity.getLongUrl();
    }

    private String generateUniqueShortCode() {
        String shortCode;
        do {
            StringBuilder sb = new StringBuilder(SHORT_CODE_LENGTH);
            for (int i = 0; i < SHORT_CODE_LENGTH; i++) {
                int randomIndex = RANDOM.nextInt(BASE62.length());
                sb.append(BASE62.charAt(randomIndex));
            }
            shortCode = sb.toString();
        } while (urlRepository.findByShortCode(shortCode).isPresent());

        return shortCode;
    }
}
