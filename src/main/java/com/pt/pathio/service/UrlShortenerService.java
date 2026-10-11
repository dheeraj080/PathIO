package com.pt.pathio.service;

import com.pt.pathio.dto.ShortenUrlRequest;
import com.pt.pathio.dto.ShortenUrlResponse;
import com.pt.pathio.dto.UpdateUrlRequest;
import com.pt.pathio.dto.UserUrlResponse;
import com.pt.pathio.entity.UrlEntity;
import com.pt.pathio.event.UrlClickedEvent;
import com.pt.pathio.exception.ConflictException;
import com.pt.pathio.exception.ResourceNotFoundException;
import com.pt.pathio.listener.UrlAnalyticsListener;
import com.pt.pathio.metrics.PathioMetrics;
import com.pt.pathio.repository.UrlRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.net.InetAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class UrlShortenerService {

    private final UrlRepository urlRepository;
    private final IdGenerator idGenerator;
    private final FeistelObfuscator feistelObfuscator;
    private final ApplicationEventPublisher eventPublisher;
    private final StringRedisTemplate redisTemplate;
    private final PathioMetrics pathioMetrics;
    private final com.pt.pathio.auth.repository.UserRepository userRepository;

    @Value("${app.shortener.domain:https://path.io/}")
    private String domain;

    @Value("${app.shortener.service-host:path.io}")
    private String serviceHost;

    private static final int SHORT_CODE_LENGTH = 7;
    private static final int MAX_ALIAS_LENGTH = 32;
    private static final String BASE62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final String CACHE_PREFIX = "url:";
    private static final String UNIQUE_PREFIX = "url:unique:";
    private static final Pattern SHORT_CODE_PATTERN = Pattern.compile("^[a-zA-Z0-9_-]{1," + MAX_ALIAS_LENGTH + "}$");
    private static final Set<String> RESERVED_ALIASES = Set.of(
            "api", "auth", "admin", "users", "urls", "analytics",
            "actuator", "swagger", "swagger-ui", "v3", "login", "error",
            "public", "health", "favicon.ico");

    public ShortenUrlResponse shortenUrl(ShortenUrlRequest request) {
        try {
            String longUrl = request.longUrl();
            validateUrlSafety(longUrl);

            com.pt.pathio.auth.entity.User user = requireCurrentUser();

            String requestedAlias = normalizeAlias(request.customAlias());
            if (requestedAlias != null) {
                validateAlias(requestedAlias);
                if (urlRepository.findByShortCode(requestedAlias).isPresent()) {
                    throw new ConflictException("Alias is already taken: " + requestedAlias);
                }
            }

            long rawId = idGenerator.nextId();
            String shortCode = requestedAlias != null
                    ? requestedAlias
                    : encodeBase62(feistelObfuscator.obfuscate(rawId));

            UrlEntity urlEntity = UrlEntity.builder()
                    .id(rawId)
                    .longUrl(longUrl)
                    .shortCode(shortCode)
                    .clickCount(0L)
                    .user(user)
                    .build();

            try {
                urlRepository.save(urlEntity);
            } catch (DataIntegrityViolationException e) {
                // Lost an alias race against a concurrent request
                throw new ConflictException("Alias is already taken: " + shortCode);
            }

            warmCache(shortCode, longUrl);
            pathioMetrics.incrementUrlShortened();

            String baseUrl = baseUrl();
            log.info("Successfully shortened URL: rawId={} shortCode={} userId={} customAlias={}",
                    rawId, shortCode, user.getId(), requestedAlias != null);
            return new ShortenUrlResponse(baseUrl + shortCode, longUrl);
        } catch (Exception e) {
            pathioMetrics.incrementUrlShortenFailed();
            throw e;
        }
    }

    public org.springframework.data.domain.Page<UserUrlResponse> getUserUrls(UUID userId, org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.domain.Page<UrlEntity> page = urlRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return page.map(this::toUserUrlResponse);
    }

    public org.springframework.data.domain.Page<UserUrlResponse> getAllUrls(org.springframework.data.domain.Pageable pageable) {
        return urlRepository.findAll(pageable).map(this::toUserUrlResponse);
    }

    public UserUrlResponse updateUrl(String shortCode, UUID userId, UpdateUrlRequest request) {
        UrlEntity urlEntity = urlRepository.findByShortCodeAndUserId(shortCode, userId)
                .orElseThrow(() -> new ResourceNotFoundException("URL not found for short code: " + shortCode));

        validateUrlSafety(request.longUrl());
        urlEntity.setLongUrl(request.longUrl());
        urlRepository.save(urlEntity);

        warmCache(shortCode, request.longUrl());
        pathioMetrics.incrementUrlUpdated();
        log.info("Updated destination URL for shortCode={} userId={}", shortCode, userId);

        return toUserUrlResponse(urlEntity);
    }

    public void deleteUrl(String shortCode, UUID userId) {
        UrlEntity urlEntity = urlRepository.findByShortCodeAndUserId(shortCode, userId)
                .orElseThrow(() -> new ResourceNotFoundException("URL not found for short code: " + shortCode));

        urlRepository.delete(urlEntity);
        // Evict the positive cache and plant a short-lived negative cache entry so a concurrent
        // redirect cannot resurrect the mapping from a stale cache read.
        redisTemplate.opsForValue().set(CACHE_PREFIX + shortCode, "", Duration.ofMinutes(5));
        purgeAnalyticsKeys(shortCode);
        pathioMetrics.incrementUrlDeleted();
        log.info("Deleted shortCode={} userId={}", shortCode, userId);
    }

    public void adminDeleteUrl(String shortCode) {
        UrlEntity urlEntity = urlRepository.findByShortCode(shortCode)
                .orElseThrow(() -> new ResourceNotFoundException("URL not found for short code: " + shortCode));

        urlRepository.delete(urlEntity);
        redisTemplate.opsForValue().set(CACHE_PREFIX + shortCode, "", Duration.ofMinutes(5));
        purgeAnalyticsKeys(shortCode);
        pathioMetrics.incrementUrlDeleted();
        log.info("Admin deleted shortCode={}", shortCode);
    }

    /**
     * Removes short-code-scoped analytics state so a later user re-registering the same alias can
     * never inherit the previous owner's unique-visitor counts or unflushed pending totals. The
     * persistent rollup/breakdown rows are removed by the {@code ON DELETE CASCADE} foreign key
     * (V7); the Redis HLL key and the pending buffer are short-code-addressed and must be purged
     * here. Best-effort: DB deletion is never rolled back by a Redis outage.
     */
    private void purgeAnalyticsKeys(String shortCode) {
        try {
            redisTemplate.delete(UNIQUE_PREFIX + shortCode);
            redisTemplate.opsForHash().delete(UrlAnalyticsListener.PENDING_HASH, shortCode);
        } catch (Exception e) {
            log.warn("Failed to purge analytics keys for shortCode={}", shortCode, e);
        }
    }

    private com.pt.pathio.auth.entity.User requireCurrentUser() {
        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated()
                && auth.getPrincipal() instanceof com.pt.pathio.auth.UserPrincipal principal) {
            return userRepository.findById(principal.id())
                    .orElseThrow(() -> new AccessDeniedException("Authenticated user no longer exists"));
        }
        // Defense in depth: shortening requires an authenticated user (HTTP layer returns 401 first).
        throw new AccessDeniedException("Authentication is required to shorten URLs");
    }

    private UserUrlResponse toUserUrlResponse(UrlEntity entity) {
        return new UserUrlResponse(
                entity.getShortCode(),
                baseUrl() + entity.getShortCode(),
                entity.getLongUrl(),
                entity.getClickCount(),
                entity.getCreatedAt()
        );
    }

    private String baseUrl() {
        return domain.endsWith("/") ? domain : domain + "/";
    }

    private void warmCache(String shortCode, String longUrl) {
        try {
            redisTemplate.opsForValue().set(CACHE_PREFIX + shortCode, longUrl, Duration.ofDays(7));
        } catch (Exception e) {
            // Cache warming is best-effort; the redirect path repopulates on cache miss.
            log.warn("Failed to warm cache for shortCode={}", shortCode, e);
        }
    }

    private String normalizeAlias(String customAlias) {
        if (customAlias == null) {
            return null;
        }
        String trimmed = customAlias.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void validateAlias(String alias) {
        if (alias.length() > MAX_ALIAS_LENGTH) {
            throw new IllegalArgumentException("Alias must be at most " + MAX_ALIAS_LENGTH + " characters");
        }
        if (!SHORT_CODE_PATTERN.matcher(alias).matches()) {
            throw new IllegalArgumentException("Alias may only contain letters, digits, hyphens and underscores");
        }
        if (RESERVED_ALIASES.contains(alias.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Alias is reserved and cannot be used: " + alias);
        }
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
        return getOriginalUrl(shortCode, null, null, null);
    }

    public String getOriginalUrl(String shortCode, String clientIp, String userAgent, String referrer) {
        long startTime = System.currentTimeMillis();
        try {
            if (shortCode == null || !SHORT_CODE_PATTERN.matcher(shortCode).matches()) {
                throw new IllegalArgumentException("Invalid short code format");
            }

            String cacheKey = CACHE_PREFIX + shortCode;
            String longUrl = redisTemplate.opsForValue().get(cacheKey);

            if (longUrl != null && longUrl.isEmpty()) {
                // Negative cache entry
                throw new ResourceNotFoundException("URL not found for code: " + shortCode);
            }

            if (longUrl != null) {
                pathioMetrics.incrementCacheHit();
            } else {
                // Cache miss -> Fetch from PostgreSQL
                pathioMetrics.incrementCacheMiss();
                UrlEntity urlEntity = urlRepository.findByShortCode(shortCode).orElse(null);

                if (urlEntity == null) {
                    redisTemplate.opsForValue().set(cacheKey, "", Duration.ofMinutes(5));
                    throw new ResourceNotFoundException("URL not found for code: " + shortCode);
                }

                longUrl = urlEntity.getLongUrl();
                redisTemplate.opsForValue().set(cacheKey, longUrl, Duration.ofDays(7));
            }

            recordClick(shortCode, clientIp, userAgent, referrer);
            return longUrl;
        } finally {
            pathioMetrics.recordRedirectLatency(System.currentTimeMillis() - startTime);
        }
    }

    private void recordClick(String shortCode, String clientIp, String userAgent, String referrer) {
        eventPublisher.publishEvent(new UrlClickedEvent(shortCode, referrer, userAgent, Instant.now()));
        recordUniqueVisitor(shortCode, clientIp, userAgent);
    }

    private void recordUniqueVisitor(String shortCode, String clientIp, String userAgent) {
        if ((clientIp == null || clientIp.isBlank()) && (userAgent == null || userAgent.isBlank())) {
            return;
        }
        try {
            String visitor = hashVisitor(clientIp, userAgent);
            String key = UNIQUE_PREFIX + shortCode;
            redisTemplate.opsForHyperLogLog().add(key, visitor);
            redisTemplate.expire(key, Duration.ofDays(90));
        } catch (Exception e) {
            log.warn("Failed to record unique visitor for shortCode={}", shortCode, e);
        }
    }

    private String hashVisitor(String clientIp, String userAgent) {
        String raw = (clientIp == null ? "" : clientIp) + "|" + (userAgent == null ? "" : userAgent);
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(Character.forDigit((b >> 4) & 0xF, 16));
                sb.append(Character.forDigit(b & 0xF, 16));
            }
            return sb.toString();
        } catch (Exception e) {
            return raw;
        }
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
