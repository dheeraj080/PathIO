package com.pt.pathio.auth.service;

import com.pt.pathio.auth.dto.CreateApiKeyResponse;
import com.pt.pathio.auth.entity.ApiKey;
import com.pt.pathio.auth.entity.Role;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.repository.ApiKeyRepository;
import com.pt.pathio.auth.repository.UserRepository;
import com.pt.pathio.exception.ResourceNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.anyLong;
import static org.mockito.Mockito.eq;

/**
 * Headless tests for {@link ApiKeyService}. These exercise the key lifecycle without a database:
 * plaintext-once semantics, digest-only persistence, owner-scoped revocation, and expiry mapping.
 */
class ApiKeyServiceTest {

    private static final UUID USER_ID = UUID.randomUUID();

    private ApiKeyRepository apiKeyRepository;
    private UserRepository userRepository;
    private ApiKeyService service;

    @BeforeEach
    void setUp() {
        apiKeyRepository = mock(ApiKeyRepository.class);
        userRepository = mock(UserRepository.class);
        service = new ApiKeyService(apiKeyRepository, userRepository);
    }

    private User user() {
        return User.builder()
                .id(USER_ID)
                .email("alice@example.com")
                .enabled(true)
                .roles(Set.of(Role.builder().name("ROLE_USER").build()))
                .build();
    }

    private ApiKey key(long id, String name, boolean active, User owner) {
        return ApiKey.builder()
                .id(id)
                .user(owner)
                .name(name)
                .keyHash("key-hash-" + id)
                .active(active)
                .createdAt(Instant.now())
                .build();
    }

    @Test
    @DisplayName("create() returns a pio_-prefixed plaintext only once and persists its SHA-256 digest")
    void createPersistsDigestAndReturnsPlaintext() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user()));
        when(apiKeyRepository.save(any(ApiKey.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateApiKeyResponse response = service.create(USER_ID, "ci-deploy", null);

        assertThat(response.key()).startsWith("pio_");
        assertThat(response.key()).hasSize("pio_".length() + ApiKeyService.KEY_RANDOM_CHARS);

        ArgumentCaptor<ApiKey> captor = ArgumentCaptor.forClass(ApiKey.class);
        verify(apiKeyRepository).save(captor.capture());
        ApiKey saved = captor.getValue();
        assertThat(saved.getKeyHash()).isEqualTo(ApiKeyService.hash(response.key()));
        assertThat(saved.getKeyHash()).isNotEqualTo(response.key());
        assertThat(saved.getKeyHash()).hasSize(64);
        assertThat(saved.isActive()).isTrue();
        assertThat(saved.getExpiresAt()).isNull();
        assertThat(saved.getUser().getId()).isEqualTo(USER_ID);
    }

    @Test
    @DisplayName("create() maps expiresInDays onto expires_at and rejects non-positive windows")
    void createAppliesExpiry() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user()));
        when(apiKeyRepository.save(any(ApiKey.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.create(USER_ID, "short-lived", 90);

        ArgumentCaptor<ApiKey> captor = ArgumentCaptor.forClass(ApiKey.class);
        verify(apiKeyRepository).save(captor.capture());
        assertThat(captor.getValue().getExpiresAt())
                .isEqualTo(captor.getValue().getCreatedAt().plus(Duration.ofDays(90)));
    }

    @Test
    @DisplayName("create() rejects non-positive expiry windows without saving")
    void createRejectsBadExpiry() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user()));

        assertThatThrownBy(() -> service.create(USER_ID, "bad", 0))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.create(USER_ID, "bad", -7))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(apiKeyRepository);
    }

    @Test
    @DisplayName("create() fails when the owning user no longer exists")
    void createMissingOwner() {
        when(userRepository.findById(USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(USER_ID, "ghost", null))
                .isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(apiKeyRepository);
    }

    @Test
    @DisplayName("list() returns newest-first metadata and never exposes digests")
    void listReturnsMetadataOnly() {
        ApiKey newer = key(11L, "ci", true, user());
        ApiKey older = key(10L, "demo", true, user());
        when(apiKeyRepository.findByUserIdOrderByCreatedAtDesc(USER_ID))
                .thenReturn(List.of(newer, older));

        var responses = service.list(USER_ID);

        assertThat(responses.stream().map(r -> r.id())).containsExactly(11L, 10L);
        assertThat(responses.stream().map(r -> r.name())).containsExactly("ci", "demo");
        assertThat(responses).noneMatch(r -> r.toString().contains("keyHash"));
    }

    @Test
    @DisplayName("revoke() soft-revokes the caller's key")
    void revokeOwnedKey() {
        ApiKey mine = key(1L, "mine", true, user());
        when(apiKeyRepository.findById(1L)).thenReturn(Optional.of(mine));

        service.revoke(USER_ID, 1L);

        assertThat(mine.isActive()).isFalse();
        verify(apiKeyRepository).save(mine);
    }

    @Test
    @DisplayName("revoke() of a foreign key 404s without touching anything")
    void revokeForeignKeyIsNotFound() {
        User bob = User.builder().id(UUID.randomUUID()).email("bob@example.com").build();
        ApiKey theirs = key(1L, "theirs", true, bob);
        when(apiKeyRepository.findById(1L)).thenReturn(Optional.of(theirs));

        assertThatThrownBy(() -> service.revoke(USER_ID, 1L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(apiKeyRepository, never()).save(any());
    }

    @Test
    @DisplayName("hash() is a deterministic 64-char SHA-256 hex digest")
    void hashIsDeterministicSha256() {
        assertThat(ApiKeyService.hash("pio_secret"))
                .isEqualTo(ApiKeyService.hash("pio_secret"))
                .hasSize(64);
        assertThat(ApiKeyService.hash("pio_secret")).isNotEqualTo(ApiKeyService.hash("pio_secref"));
    }

    @Test
    @DisplayName("markUsed() failure degrades silently (best-effort usage stamp)")
    void markUsedFailureIsSilent() {
        when(apiKeyRepository.updateLastUsed(anyLong(), any())).thenThrow(new RuntimeException("db down"));
        // No exception escapes the async best-effort path even when invoked synchronously in the test.
        service.markUsed(1L);
        verify(apiKeyRepository).updateLastUsed(eq(1L), any());
    }
}