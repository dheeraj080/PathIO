package com.pt.pathio.service;

import com.pt.pathio.dto.ShortenUrlRequest;
import com.pt.pathio.dto.ShortenUrlResponse;
import com.pt.pathio.entity.UrlEntity;
import com.pt.pathio.event.UrlClickedEvent;
import com.pt.pathio.repository.UrlRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.net.InetAddress;
import java.net.URI;
import java.time.Duration;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class UrlShortenerService {

    private final UrlRepository urlRepository;
    private final IdGenerator idGenerator;
    private final FeistelObfuscator feistelObfuscator;
    private final ApplicationEventPublisher eventPublisher;
    private final StringRedisTemplate redisTemplate;

    private static final int SHORT_CODE_LENGTH = 7;
    private static final String BASE62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final String DOMAIN = "https://path.io/";
    private static final String SERVICE_HOST = "path.io";
    private static final String CACHE_PREFIX = "url:";

    public ShortenUrlResponse shortenUrl(ShortenUrlRequest request) {

        String longUrl = request.getLongUrl();
        validateUrlSafety(longUrl);

        long rawId = idGenerator.nextId();
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

    private void validateUrlSafety(String url) {
        try {
            URI uri = new URI(url);
            String host = uri.getHost();

            if (host == null) {
                throw new IllegalArgumentException("Invalid URL host");
            }

            if (host.equalsIgnoreCase(SERVICE_HOST) || url.startsWith(DOMAIN)) {
                throw new IllegalArgumentException("Cannot shorten URLs pointing to this service domain");
            }

            if (isForbiddenHost(host)) {
                throw new IllegalArgumentException("URL host is not allowed");
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid or malformed URL");
        }
    }

    public boolean isForbiddenHost(String host) {
        String lowerHost = host.toLowerCase();

        if (lowerHost.equals("localhost") || lowerHost.endsWith(".local") || lowerHost.endsWith(".internal")) {
            return true;
        }

        try {
            InetAddress inetAddress = InetAddress.getByName(host);
            return inetAddress.isLoopbackAddress() ||
                    inetAddress.isAnyLocalAddress() ||
                    inetAddress.isSiteLocalAddress() ||
                    inetAddress.isLinkLocalAddress();
        } catch (Exception e) {
            return false;
        }
    }


    public String getOriginalUrl(String shortCode) {
        if (shortCode == null || shortCode.length() != 7 || !shortCode.matches("^[a-zA-Z0-9]+$")) {
            throw new IllegalArgumentException("Invalid short code format");
        }

        String cacheKey = CACHE_PREFIX + shortCode;
        String longUrl = redisTemplate.opsForValue().get(cacheKey);

        if (longUrl != null) {
            if (longUrl.isEmpty()) {
                throw new RuntimeException("Url not Found for short code: " + shortCode);
            }
            eventPublisher.publishEvent(new UrlClickedEvent(shortCode));
            return longUrl;
        }

        // 1. Use .orElse(null) instead of .orElseThrow() directly
        UrlEntity urlEntity = urlRepository.findByShortCode(shortCode).orElse(null);

        // 2. Now this check works as intended!
        if (urlEntity == null) {
            redisTemplate.opsForValue().set(cacheKey, "", Duration.ofMinutes(5));
            throw new RuntimeException("URL not found for short code: " + shortCode);
        }

        redisTemplate.opsForValue().set(cacheKey, urlEntity.getLongUrl(), Duration.ofDays(7));
        eventPublisher.publishEvent(new UrlClickedEvent(shortCode));

        return urlEntity.getLongUrl();
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
