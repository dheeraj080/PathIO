package com.pt.pathio.auth.security;

import com.pt.pathio.auth.entity.Role;
import com.pt.pathio.auth.entity.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.Getter;
import lombok.Setter;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@Getter
@Setter
public class JwtService {

    /**
     * Publicly known or obviously-placeholder secrets that must never be used to sign real tokens.
     * Startup is refused whenever the configured secret matches one of these values, unless the
     * explicit dev-only fallback is active. The legacy default is public (it exists in repo history)
     * and therefore cannot be used in any non-development environment.
     */
    static final Set<String> KNOWN_INSECURE_SECRETS = Set.of(
            "vS9p8u2M5rX7n4Q1z6W0E3t9Y4A8S5D2F1G7H3J6K9L0P3M1N4B7V2C5X8Z1Q9W0", // legacy public default
            "change-me",
            "changeme",
            "CHANGE_ME",
            "secret"
    );

    /**
     * Documented DEVELOPMENT-ONLY fallback secret. It is intentionally public and is accepted ONLY
     * when the active profile is {@code dev} AND the explicit property
     * {@code security.jwt.dev-fallback=true} is set. Non-dev startups refuse to start instead of
     * ever using this value, so it can never silently sign production tokens.
     */
    static final String DEV_FALLBACK_SECRET = "vS9p8u2M5rX7n4Q1z6W0E3t9Y4A8S5D2F1G7H3J6K9L0P3M1N4B7V2C5X8Z1Q9W0";

    private final String secret;
    private final long accessTtlSeconds;
    private final long refreshTtlSeconds;
    private final String issuer;
    private final SecretKey key;

    public JwtService(Environment env) {
        boolean devProfileActive = Arrays.asList(env.getActiveProfiles()).contains("dev");
        boolean devFallbackEnabled = env.getProperty("security.jwt.dev-fallback", Boolean.class, false);

        String configured = env.getProperty("security.jwt.secret");
        if (configured == null || configured.isBlank()) {
            if (devProfileActive && devFallbackEnabled) {
                this.secret = DEV_FALLBACK_SECRET;
            } else {
                throw new IllegalStateException(
                        "No JWT signing secret is configured. Set security.jwt.secret (env JWT_SECRET) to "
                        + "a fresh random value of at least 64 characters before starting the application. "
                        + "A documented dev-only fallback exists only with spring.profiles.active=dev and "
                        + "security.jwt.dev-fallback=true.");
            }
        } else {
            this.secret = configured;
        }

        if (this.secret.length() < 64) {
            throw new IllegalArgumentException("Invalid JWT signing secret: its length must be at least 64 characters.");
        }
        if (!(devProfileActive && devFallbackEnabled) && KNOWN_INSECURE_SECRETS.contains(this.secret)) {
            throw new IllegalStateException(
                    "The configured JWT signing secret is a known insecure or placeholder value; startup is "
                    + "refused. Generate a fresh random secret (e.g. `openssl rand -base64 48`).");
        }
        this.key = Keys.hmacShaKeyFor(this.secret.getBytes(StandardCharsets.UTF_8));

        this.accessTtlSeconds = env.getProperty("security.jwt.access-ttl-seconds", Long.class, 3600L);
        this.refreshTtlSeconds = env.getProperty("security.jwt.refresh-ttl-seconds", Long.class, 2592000L);
        this.issuer = env.getProperty("security.jwt.issuer", "pathio");
    }

    //generate token:
    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        List<String> roles = user.getRoles() == null ? List.of() :
                user.getRoles().stream().map(Role::getName).toList();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(user.getId().toString())
                .issuer(issuer)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(accessTtlSeconds)))
                .claims(Map.of(
                        "email", user.getEmail(),
                        "roles", roles,
                        "typ", "access"
                ))
                .signWith(key, SignatureAlgorithm.HS512)
                .compact();
    }

    // generate refreshotken.
    public String generateRefreshToken(User user, String jti) {
        Instant now = Instant.now();
        return Jwts.builder()
                .id(jti)
                .subject(user.getId().toString())
                .issuer(issuer)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(refreshTtlSeconds)))
                .claim("typ", "refresh")
                .signWith(key, SignatureAlgorithm.HS512)
                .compact();
    }

    //parse the token

    public Jws<Claims> parse(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
    }

    public boolean isAccessToken(String token) {
        Claims c = parse(token).getPayload();
        return "access".equals(c.get("typ"));
    }


    public boolean isRefreshToken(String token) {
        Claims c = parse(token).getPayload();
        return "refresh".equals(c.get("typ"));
    }

    public UUID getUserId(String token) {
        Claims c = parse(token).getPayload();
        return UUID.fromString(c.getSubject());
    }

    public String getJti(String token) {
        return parse(token).getPayload().getId();
    }

    public List<String> getRoles(String token) {
        Claims c = parse(token).getPayload();
        return (List<String>) c.get("roles");
    }

    public String getEmail(String token) {
        Claims c = parse(token).getPayload();
        return (String) c.get("email");
    }

}