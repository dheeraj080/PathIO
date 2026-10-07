package com.pt.pathio.service;

import com.pt.pathio.dto.ShortenUrlRequest;
import com.pt.pathio.dto.ShortenUrlResponse;
import com.pt.pathio.entity.UrlEntity;
import com.pt.pathio.event.UrlClickedEvent;
import com.pt.pathio.exception.ResourceNotFoundException;
import com.pt.pathio.repository.UrlRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${app.shortener.domain:https://path.io/}")
    private String domain;

    @Value("${app.shortener.service-host:path.io}")
    private String serviceHost;

    private static final int SHORT_CODE_LENGTH = 7;
    private static final String BASE62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final String CACHE_PREFIX = "url:";

    public ShortenUrlResponse shortenUrl(ShortenUrlRequest request) {
        String longUrl = request.longUrl();
        validateUrlSafety(longUrl);

        long rawId = idGenerator.nextId();
        long obfuscatedId = feistelObfuscator.obfuscate(rawId);
        String shortCode = encodeBase62(obfuscatedId);

        UrlEntity urlEntity = UrlEntity.builder()
                .id(rawId)
                .longUrl(request.longUrl())
                .shortCode(shortCode)
                .clickCount(0L)
                .build();

        urlRepository.save(urlEntity);

        String baseUrl = domain.endsWith("/") ? domain : domain + "/";
        return new ShortenUrlResponse(baseUrl + shortCode, request.longUrl());
    }

    private void validateUrlSafety(String url) {
        try {
            URI uri = new URI(url);
            String host = uri.getHost();

            if (host == null) {
                throw new IllegalArgumentException("Invalid URL host");
            }

            if (host.equalsIgnoreCase(serviceHost) || url.startsWith(domain)) {
                throw new IllegalArgumentException("Cannot shorten URLs pointing to this service domain");
            }

            if (isForbiddenHost(host)) {
                throw new IllegalArgumentException("URL host resolves to a restricted network target");
            }
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid or malformed URL");
        }
    }

    public boolean isForbiddenHost(String host) {
        String lowerHost = host.toLowerCase(Locale.ROOT);

        if (lowerHost.equals("localhost") || lowerHost.endsWith(".local") || lowerHost.endsWith(".internal")) {
            return true;
        }

        try {
            InetAddress[] addresses = InetAddress.getAllByName(host);
            for (InetAddress inetAddress : addresses) {
                if (inetAddress.isLoopbackAddress() ||
                        inetAddress.isAnyLocalAddress() ||
                        inetAddress.isSiteLocalAddress() ||
                        inetAddress.isLinkLocalAddress() ||
                        inetAddress.isMulticastAddress()) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            return true; // Fail closed
        }
    }

    public String getOriginalUrl(String shortCode) {
        if (shortCode == null || shortCode.length() != SHORT_CODE_LENGTH || !shortCode.matches("^[a-zA-Z0-9]+$")) {
            throw new IllegalArgumentException("Invalid short code format");
        }

        String cacheKey = CACHE_PREFIX + shortCode;
        String longUrl = redisTemplate.opsForValue().get(cacheKey);

        if (longUrl != null) {
            if (longUrl.isEmpty()) {
                throw new ResourceNotFoundException("URL not found for code: " + shortCode);
            }
            eventPublisher.publishEvent(new UrlClickedEvent(shortCode));
            return longUrl;
        }

        UrlEntity urlEntity = urlRepository.findByShortCode(shortCode).orElse(null);

        if (urlEntity == null) {
            redisTemplate.opsForValue().set(cacheKey, "", Duration.ofMinutes(5));
            throw new ResourceNotFoundException("URL not found for code: " + shortCode);
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