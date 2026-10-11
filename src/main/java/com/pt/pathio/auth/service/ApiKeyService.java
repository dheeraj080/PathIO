package com.pt.pathio.auth.service;

import com.pt.pathio.auth.dto.ApiKeyResponse;
import com.pt.pathio.auth.dto.CreateApiKeyResponse;
import com.pt.pathio.auth.entity.ApiKey;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.repository.ApiKeyRepository;
import com.pt.pathio.auth.repository.UserRepository;
import com.pt.pathio.exception.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * User API keys (plan "API & Developer Experience"). Keys are opaque bearer secrets: the plaintext
 * is shown once at creation and only its SHA-256 digest is stored, so a database dump leaks no
 * usable credentials and lookups are direct hits on the unique {@code key_hash} index.
 */
@Service
@Slf4j
public class ApiKeyService {

    public static final String KEY_PREFIX = "pio_";
    static final int KEY_RANDOM_CHARS = 32;
    private static final char[] ALPHABET =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();

    private final ApiKeyRepository apiKeyRepository;
    private final UserRepository userRepository;

    public ApiKeyService(ApiKeyRepository apiKeyRepository, UserRepository userRepository) {
        this.apiKeyRepository = apiKeyRepository;
        this.userRepository = userRepository;
    }

    /**
     * Mints a key, persists only its digest, and returns the plaintext exactly once. A negative or
     * zero {@code expiresInDays} is rejected; null means the key never expires.
     */
    @Transactional
    public CreateApiKeyResponse create(UUID userId, String name, Integer expiresInDays) {
        if (expiresInDays != null && expiresInDays <= 0) {
            throw new IllegalArgumentException("expiresInDays must be null or a positive number of days");
        }
        User owner = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        String plaintext = generatePlaintext();
        Instant now = Instant.now();
        ApiKey key = ApiKey.builder()
                .user(owner)
                .name(name.trim())
                .keyHash(hash(plaintext))
                .active(true)
                .createdAt(now)
                .expiresAt(expiresInDays == null ? null : now.plus(Duration.ofDays(expiresInDays)))
                .build();

        ApiKey saved = apiKeyRepository.save(key);
        log.info("Created api key '{}' for user {} (id {})", saved.getName(), userId, saved.getId());
        return new CreateApiKeyResponse(plaintext, ApiKeyResponse.from(saved));
    }

    @Transactional(readOnly = true)
    public List<ApiKeyResponse> list(UUID userId) {
        return apiKeyRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(ApiKeyResponse::from)
                .toList();
    }

    /**
     * Soft-revokes the caller's key. Non-existent or foreign keys surface the same 404 so the
     * response does not leak whether an id belongs to someone else.
     */
    @Transactional
    public void revoke(UUID userId, long keyId) {
        ApiKey key = requireOwned(userId, keyId);
        key.setActive(false);
        apiKeyRepository.save(key);
        log.info("Revoked api key {} for user {}", keyId, userId);
    }

    /** Authentication lookup (digest → key + user), validity is evaluated by the caller. */
    @Transactional(readOnly = true)
    public Optional<ApiKey> findByKeyHash(String keyHash) {
        return apiKeyRepository.findByKeyHashWithUser(keyHash);
    }

    /**
     * Best-effort, fire-and-forget usage stamp on the bounded async executor (RED-04): a stamp race
     * or executor saturation must never fail the request that authenticated successfully.
     */
    @Async("taskExecutor")
    public void markUsed(Long keyId) {
        try {
            apiKeyRepository.updateLastUsed(keyId, Instant.now());
        } catch (Exception e) {
            log.warn("Failed to stamp last_used on api key {}: {}", keyId, e.getMessage());
        }
    }

    public static String hash(String plaintext) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(plaintext.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    static String generatePlaintext() {
        StringBuilder sb = new StringBuilder(KEY_PREFIX.length() + KEY_RANDOM_CHARS);
        sb.append(KEY_PREFIX);
        for (int i = 0; i < KEY_RANDOM_CHARS; i++) {
            sb.append(ALPHABET[RANDOM.nextInt(ALPHABET.length)]);
        }
        return sb.toString();
    }

    private ApiKey requireOwned(UUID userId, long keyId) {
        ApiKey key = apiKeyRepository.findById(keyId)
                .orElseThrow(() -> new ResourceNotFoundException("API key not found"));
        if (!key.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("API key not found");
        }
        return key;
    }
}