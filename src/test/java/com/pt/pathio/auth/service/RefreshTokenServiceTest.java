package com.pt.pathio.auth.service;

import com.pt.pathio.auth.entity.RefreshToken;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.repository.RefreshTokenRepository;
import com.pt.pathio.auth.security.JwtService;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.authentication.BadCredentialsException;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Headless unit tests for {@link RefreshTokenService} (SEC-05 / SEC-08): atomic rotation via the
 * conditional UPDATE, replay escalation across a token family, quiet rejection of benign concurrent
 * duplicates, and 401-equivalent rejection of malformed/expired/mismatched tokens. Real database
 * concurrency (row locks, isolation) is verified separately by integration tests once a database is
 * available (TEST-01).
 */
class RefreshTokenServiceTest {

    private static final String SECRET =
            "unit-test-jwt-secret-0123456789abcdefghijklmnopqrstuvwxyz-ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789";

    private RefreshTokenRepository repository;
    private RefreshTokenService service;
    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        repository = mock(RefreshTokenRepository.class);
        jwtService = new JwtService(new MockEnvironment().withProperty("security.jwt.secret", SECRET));
        service = new RefreshTokenService(repository, jwtService);
    }

    private User user() {
        return User.builder()
                .id(UUID.randomUUID())
                .email("rt@pathio.test")
                .enabled(true)
                .build();
    }

    private RefreshToken stored(String jti, User owner, Instant expiresAt, boolean revoked,
                                String replacedBy, UUID familyId) {
        RefreshToken rt = new RefreshToken();
        rt.setJti(jti);
        rt.setUser(owner);
        rt.setCreatedAt(Instant.now());
        rt.setExpiresAt(expiresAt);
        rt.setRevoked(revoked);
        rt.setReplacedByToken(replacedBy);
        rt.setFamilyId(familyId);
        rt.setRevokedAt(revoked ? Instant.now() : null);
        return rt;
    }

    @Test
    @DisplayName("Valid rotation consumes the old token atomically and mints a successor in the same family")
    void validRotationReturnsNewPair() {
        User user = user();
        String oldToken = jwtService.generateRefreshToken(user, "jti-old");
        UUID family = UUID.randomUUID();
        RefreshToken stored = stored("jti-old", user, Instant.now().plusSeconds(300), false, null, family);

        when(repository.findByJtiWithUser("jti-old")).thenReturn(Optional.of(stored));
        when(repository.rotate(eq("jti-old"), anyString(), any())).thenReturn(1);
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        RefreshTokenService.RotationResult result = service.rotate(oldToken);

        assertThat(result.accessToken()).isNotBlank();

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(repository).save(captor.capture());
        RefreshToken saved = captor.getValue();
        assertThat(saved.getFamilyId()).isEqualTo(family);
        assertThat(saved.getJti()).isNotEqualTo("jti-old");
        assertThat(saved.isRevoked()).isFalse();

        Jws<Claims> parsed = jwtService.parse(result.refreshToken());
        assertThat(parsed.getPayload().get("typ")).isEqualTo("refresh");
        assertThat(parsed.getPayload().getId()).isEqualTo(saved.getJti());
    }

    @Test
    @DisplayName("Malformed token is rejected with BadCredentials (401), not a 500")
    void malformedTokenRejected() {
        assertThatThrownBy(() -> service.rotate("not-a-jwt"))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("Invalid refresh token");
        verify(repository, never()).findByJtiWithUser(anyString());
    }

    @Test
    @DisplayName("An access token is rejected as a refresh token")
    void accessTokenRejected() {
        User user = user();
        String accessToken = jwtService.generateAccessToken(user);
        assertThatThrownBy(() -> service.rotate(accessToken))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("not a refresh token");
    }

    @Test
    @DisplayName("Unknown jti is rejected")
    void unknownJtiRejected() {
        when(repository.findByJtiWithUser("ghost")).thenReturn(Optional.empty());
        User user = user();
        String token = jwtService.generateRefreshToken(user, "ghost");
        assertThatThrownBy(() -> service.rotate(token))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("not recognized");
        verify(repository, never()).rotate(anyString(), anyString(), any());
    }

    @Test
    @DisplayName("Revoked token without successor (logout) is rejected")
    void revokedWithoutSuccessorRejected() {
        User user = user();
        String token = jwtService.generateRefreshToken(user, "jti-logged-out");
        when(repository.findByJtiWithUser("jti-logged-out"))
                .thenReturn(Optional.of(stored("jti-logged-out", user, future(), true, null, UUID.randomUUID())));

        assertThatThrownBy(() -> service.rotate(token))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("revoked or expired");
        verify(repository, never()).revokeFamily(any(), any());
    }

    @Test
    @DisplayName("Duplicate from a concurrent refresh (active successor) is rejected quietly without family revocation")
    void duplicateWithActiveSuccessorIsQuiet() {
        User user = user();
        UUID family = UUID.randomUUID();
        String token = jwtService.generateRefreshToken(user, "jti-rotated");
        RefreshToken successor = stored("jti-new", user, future(), false, null, family);
        when(repository.findByJtiWithUser("jti-rotated"))
                .thenReturn(Optional.of(stored("jti-rotated", user, future(), true, "jti-new", family)));
        when(repository.findByJti("jti-new")).thenReturn(Optional.of(successor));

        assertThatThrownBy(() -> service.rotate(token))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("already used");
        verify(repository, never()).revokeFamily(any(), any());
    }

    @Test
    @DisplayName("Replay of a superseded token whose successor was also rotated escalates to family revocation")
    void replayAfterFurtherRotationRevokesFamily() {
        User user = user();
        UUID family = UUID.randomUUID();
        String token = jwtService.generateRefreshToken(user, "jti-old");
        RefreshToken revokedSuccessor = stored("jti-mid", user, future(), true, "jti-abc", family);
        when(repository.findByJtiWithUser("jti-old"))
                .thenReturn(Optional.of(stored("jti-old", user, future(), true, "jti-mid", family)));
        when(repository.findByJti("jti-mid")).thenReturn(Optional.of(revokedSuccessor));

        assertThatThrownBy(() -> service.rotate(token))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("re-use detected");
        verify(repository).revokeFamily(eq(family), any());
    }

    @Test
    @DisplayName("Expired token is rejected and marked revoked")
    void expiredTokenRejectedAndMarkedRevoked() {
        User user = user();
        String token = jwtService.generateRefreshToken(user, "jti-expired");
        RefreshToken expired = stored("jti-expired", user, Instant.now().minusSeconds(1), false, null, UUID.randomUUID());
        when(repository.findByJtiWithUser("jti-expired")).thenReturn(Optional.of(expired));
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        assertThatThrownBy(() -> service.rotate(token))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("expired");
        verify(repository).save(argThat(rt -> rt.isRevoked()));
    }

    @Test
    @DisplayName("Token bound to a different user is rejected")
    void userMismatchRejected() {
        User signer = user();
        User owner = user();
        String token = jwtService.generateRefreshToken(signer, "jti-mismatch");
        when(repository.findByJtiWithUser("jti-mismatch"))
                .thenReturn(Optional.of(stored("jti-mismatch", owner, future(), false, null, UUID.randomUUID())));

        assertThatThrownBy(() -> service.rotate(token))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("does not belong to this user");
    }

    @Test
    @DisplayName("Lost conditional-update race is rejected as a duplicate without saving a successor")
    void lostRaceRejected() {
        User user = user();
        String token = jwtService.generateRefreshToken(user, "jti-race");
        when(repository.findByJtiWithUser("jti-race"))
                .thenReturn(Optional.of(stored("jti-race", user, future(), false, null, UUID.randomUUID())));
        when(repository.rotate(eq("jti-race"), anyString(), any())).thenReturn(0);

        assertThatThrownBy(() -> service.rotate(token))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessageContaining("already used");
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("issue() creates a token family")
    void issueCreatesFamily() {
        when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        RefreshToken entity = service.issue(user());
        assertThat(entity.getFamilyId()).isNotNull();
        assertThat(entity.isRevoked()).isFalse();
    }

    private Instant future() {
        return Instant.now().plusSeconds(600);
    }
}