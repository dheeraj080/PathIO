package com.pt.pathio.service;

import com.pt.pathio.auth.repository.UserRepository;
import com.pt.pathio.entity.UrlEntity;
import com.pt.pathio.exception.ResourceNotFoundException;
import com.pt.pathio.metrics.PathioMetrics;
import com.pt.pathio.repository.UrlRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Headless tests for the redirect cache read path (RED-01): Redis is an accelerator, not the
 * source of truth, so a cache outage must fail open to PostgreSQL instead of returning 500 to every
 * visitor.
 */
class UrlShortenerServiceCacheFallbackTest {

    private static final String CODE = "abc123";
    private static final String LONG_URL = "https://example.com/destination";

    private StringRedisTemplate redisTemplate;
    private ValueOperations<String, String> valueOps;
    private UrlRepository urlRepository;
    private PathioMetrics pathioMetrics;
    private UrlShortenerService service;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        redisTemplate = mock(StringRedisTemplate.class);
        valueOps = mock(ValueOperations.class);
        urlRepository = mock(UrlRepository.class);
        pathioMetrics = mock(PathioMetrics.class);
        when(redisTemplate.opsForValue()).thenReturn((ValueOperations) valueOps);

        service = new UrlShortenerService(
                urlRepository,
                mock(IdGenerator.class),
                mock(FeistelObfuscator.class),
                mock(ApplicationEventPublisher.class),
                redisTemplate,
                pathioMetrics,
                mock(UserRepository.class));
    }

    private UrlEntity entity() {
        return UrlEntity.builder()
                .id(1L)
                .shortCode(CODE)
                .longUrl(LONG_URL)
                .clickCount(0L)
                .build();
    }

    @Test
    @DisplayName("Redis read failure falls back to PostgreSQL and skips cache writes")
    void redisReadFailureFallsBackToPostgres() {
        when(valueOps.get(anyString())).thenThrow(new RedisConnectionFailureException("redis down"));
        when(urlRepository.findByShortCode(CODE)).thenReturn(Optional.of(entity()));

        String resolved = service.getOriginalUrl(CODE);

        assertThat(resolved).isEqualTo(LONG_URL);
        verify(pathioMetrics).incrementCacheReadFailure();
        verify(pathioMetrics).incrementCacheMiss();
        verify(pathioMetrics, never()).incrementCacheHit();
        verify(valueOps, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    @DisplayName("Redis read failure and a missing row still raises not-found, not a 500")
    void redisReadFailureMissingRowRaisesNotFound() {
        when(valueOps.get(anyString())).thenThrow(new RedisConnectionFailureException("redis down"));
        when(urlRepository.findByShortCode(CODE)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getOriginalUrl(CODE))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(pathioMetrics).incrementCacheReadFailure();
    }

    @Test
    @DisplayName("A cache hit is served without touching the database")
    void cacheHitSkipsDatabase() {
        when(valueOps.get(anyString())).thenReturn(LONG_URL);

        String resolved = service.getOriginalUrl(CODE);

        assertThat(resolved).isEqualTo(LONG_URL);
        verify(pathioMetrics).incrementCacheHit();
        verify(urlRepository, never()).findByShortCode(anyString());
    }

    @Test
    @DisplayName("A negative cache entry raises not-found without a database read")
    void negativeCacheEntryRaisesNotFound() {
        when(valueOps.get(anyString())).thenReturn("");

        assertThatThrownBy(() -> service.getOriginalUrl(CODE))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(urlRepository, never()).findByShortCode(anyString());
    }

    @Test
    @DisplayName("A cache miss reads the database and warms the cache")
    void cacheMissReadsDatabaseAndWarmsCache() {
        when(valueOps.get(anyString())).thenReturn(null);
        when(urlRepository.findByShortCode(CODE)).thenReturn(Optional.of(entity()));

        String resolved = service.getOriginalUrl(CODE);

        assertThat(resolved).isEqualTo(LONG_URL);
        verify(pathioMetrics).incrementCacheMiss();
        verify(pathioMetrics, never()).incrementCacheReadFailure();
        verify(valueOps).set(eq("url:" + CODE), eq(LONG_URL), any(Duration.class));
    }

    @Test
    @DisplayName("Miss on a missing code writes the negative cache entry and raises not-found")
    void missingCodeWritesNegativeCache() {
        when(valueOps.get(anyString())).thenReturn(null);
        when(urlRepository.findByShortCode(CODE)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getOriginalUrl(CODE))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(valueOps).set(eq("url:" + CODE), eq(""), any(Duration.class));
    }
}