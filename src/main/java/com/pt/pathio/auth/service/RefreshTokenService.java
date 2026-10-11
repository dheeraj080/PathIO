package com.pt.pathio.auth.service;

import com.pt.pathio.auth.entity.RefreshToken;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.repository.RefreshTokenRepository;
import com.pt.pathio.auth.security.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Owns all refresh-token lifecycle operations:
 * <ul>
 *   <li><b>Issue</b> — creates a fresh token family on login / OAuth sign-in.</li>
 *   <li><b>Rotate</b> — atomically consumes the presented token (conditional UPDATE, SEC-05),
 *       then mints a successor in the same family. A replayed superseded token whose successor
 *       was itself rotated escalates to full family revocation; a benign duplicate (concurrent
 *       refresh race) is rejected quietly. Malformed / wrong-type / expired / mismatched tokens
 *       are rejected with 401-equivalent {@link BadCredentialsException} instead of a 500
 *       (SEC-08).</li>
 *   <li><b>Revoke (logout)</b> — revokes the presented token and its whole family,
 *       consistent with account-wide revocations.</li>
 * </ul>
 */
@Service
@Transactional
public class RefreshTokenService {

    public record RotationResult(String accessToken, String refreshToken, User user) {
    }

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtService jwtService;

    public RefreshTokenService(RefreshTokenRepository refreshTokenRepository, JwtService jwtService) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.jwtService = jwtService;
    }

    /** Creates and persists a new refresh-token family for a freshly authenticated user. */
    public RefreshToken issue(User user) {
        RefreshToken entity = RefreshToken.builder()
                .jti(UUID.randomUUID().toString())
                .user(user)
                .familyId(UUID.randomUUID())
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(jwtService.getRefreshTtlSeconds()))
                .revoked(false)
                .build();
        return refreshTokenRepository.save(entity);
    }

    /**
     * Validates and rotates the presented refresh token. Returns the newly issued pair.
     *
     * @throws BadCredentialsException for every rejection (unknown, malformed, wrong type,
     *                                 expired, revoked, replayed, mismatched user, lost race)
     */
    public RotationResult rotate(String rawRefreshToken) {
        Claims claims;
        try {
            claims = jwtService.parse(rawRefreshToken).getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            throw new BadCredentialsException("Invalid refresh token");
        }
        if (!"refresh".equals(claims.get("typ"))) {
            throw new BadCredentialsException("Token is not a refresh token");
        }
        String jti = claims.getId();
        UUID userId;
        try {
            userId = UUID.fromString(claims.getSubject());
        } catch (IllegalArgumentException e) {
            throw new BadCredentialsException("Refresh token does not belong to this user");
        }

        RefreshToken stored = refreshTokenRepository.findByJtiWithUser(jti)
                .orElseThrow(() -> new BadCredentialsException("Refresh token not recognized"));

        if (stored.isRevoked()) {
            String replacedBy = stored.getReplacedByToken();
            if (replacedBy == null) {
                throw new BadCredentialsException("Refresh token revoked or expired");
            }
            RefreshToken successor = refreshTokenRepository.findByJti(replacedBy).orElse(null);
            if (successor == null || successor.isRevoked()) {
                // The chain advanced beyond the successor: this token is being replayed after
                // further rotations → revoke the whole family (replay escalation).
                refreshTokenRepository.revokeFamily(stored.getFamilyId(), Instant.now());
                throw new BadCredentialsException("Refresh token re-use detected; session revoked");
            }
            // Successor still active → a benign duplicate from a concurrent refresh race.
            throw new BadCredentialsException("Refresh token already used");
        }

        if (stored.getExpiresAt().isBefore(Instant.now())) {
            stored.setRevoked(true);
            stored.setRevokedAt(Instant.now());
            refreshTokenRepository.save(stored);
            throw new BadCredentialsException("Refresh token expired");
        }

        if (!stored.getUser().getId().equals(userId)) {
            throw new BadCredentialsException("Refresh token does not belong to this user");
        }

        String newJti = UUID.randomUUID().toString();
        int consumed = refreshTokenRepository.rotate(stored.getJti(), newJti, Instant.now());
        if (consumed == 0) {
            // A concurrent request already consumed this token before our conditional UPDATE.
            throw new BadCredentialsException("Refresh token already used");
        }

        UUID familyId = stored.getFamilyId() != null ? stored.getFamilyId() : UUID.randomUUID();
        RefreshToken successor = RefreshToken.builder()
                .jti(newJti)
                .user(stored.getUser())
                .familyId(familyId)
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(jwtService.getRefreshTtlSeconds()))
                .revoked(false)
                .build();
        refreshTokenRepository.save(successor);

        User user = stored.getUser();
        return new RotationResult(
                jwtService.generateAccessToken(user),
                jwtService.generateRefreshToken(user, newJti),
                user
        );
    }

    /**
     * Revokes the presented refresh token and its family. Malformed or non-refresh tokens are
     * silently ignored (logout must always succeed as a no-op for garbage input).
     */
    public Optional<String> revokePresented(String rawRefreshToken) {
        try {
            Claims claims = jwtService.parse(rawRefreshToken).getPayload();
            if (!"refresh".equals(claims.get("typ"))) {
                return Optional.empty();
            }
            String jti = claims.getId();
            Optional<RefreshToken> stored = refreshTokenRepository.findByJtiWithUser(jti);
            stored.ifPresent(rt -> {
                rt.setRevoked(true);
                rt.setRevokedAt(Instant.now());
                refreshTokenRepository.save(rt);
                if (rt.getFamilyId() != null) {
                    refreshTokenRepository.revokeFamily(rt.getFamilyId(), Instant.now());
                }
            });
            return Optional.of(jti);
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}