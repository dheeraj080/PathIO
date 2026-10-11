package com.pt.pathio.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pt.pathio.auth.entity.Provider;
import com.pt.pathio.auth.entity.RefreshToken;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.exceptions.ProviderIdentityException;
import com.pt.pathio.auth.repository.UserRepository;
import com.pt.pathio.auth.service.RefreshTokenService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final Logger logger = LoggerFactory.getLogger(this.getClass());
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final CookieService cookieService;
    private final RefreshTokenService refreshTokenService;
    private final ObjectMapper objectMapper;
    private final List<String> authorizedOrigins;

    public OAuth2SuccessHandler(
            UserRepository userRepository,
            JwtService jwtService,
            CookieService cookieService,
            RefreshTokenService refreshTokenService,
            ObjectMapper objectMapper,
            @Value("${app.oauth2.authorized-origins:${app.cors.allowed-origins:http://localhost:3000,http://localhost:3001}}") String authorizedOriginsStr
    ) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.cookieService = cookieService;
        this.refreshTokenService = refreshTokenService;
        this.objectMapper = objectMapper;
        this.authorizedOrigins = Arrays.stream(authorizedOriginsStr.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }

    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String registrationId = "unknown";
        if (authentication instanceof OAuth2AuthenticationToken token) {
            registrationId = token.getAuthorizedClientRegistrationId();
        }

        logger.info("OAuth2 authentication succeeded for provider: {}", registrationId);

        User user;
        try {
            user = resolveUser(registrationId, oAuth2User.getAttributes());
        } catch (ProviderIdentityException e) {
            logger.warn("OAuth2 identity rejected for provider {}: {}", registrationId, e.getMessage());
            OAuthPopupResponse.write(response, objectMapper, authorizedOrigins,
                    Map.of(
                            "type", "OAUTH_AUTH_FAILURE",
                            "error", e.getMessage()
                    ),
                    HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        RefreshToken refreshTokenEntity = refreshTokenService.issue(user);

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user, refreshTokenEntity.getJti());
        cookieService.attachRefreshCookie(response, refreshToken, (int) jwtService.getRefreshTtlSeconds());

        Map<String, Object> userPayload = Map.of(
                "id", user.getId().toString(),
                "email", user.getEmail(),
                "name", user.getName() != null ? user.getName() : "",
                "image", user.getImage() != null ? user.getImage() : ""
        );

        // The refresh token is delivered only via the HttpOnly cookie; the popup postMessage
        // carries only the in-memory access token (SEC-02).
        Map<String, Object> messagePayload = Map.of(
                "type", "OAUTH_AUTH_SUCCESS",
                "payload", Map.of(
                        "accessToken", accessToken,
                        "expiresIn", jwtService.getAccessTtlSeconds(),
                        "user", userPayload
                )
        );

        OAuthPopupResponse.write(response, objectMapper, authorizedOrigins, messagePayload, HttpServletResponse.SC_OK);
    }

    /**
     * Maps an OAuth subject to an application user. Provider identity (id) is authoritative; an
     * email match only links to a same-provider account, and any cross-provider or LOCAL collision
     * fails explicitly instead of silently merging identities (SEC-09).
     */
    private User resolveUser(String registrationId, Map<String, Object> attributes) {
        switch (registrationId) {
            case "google" -> {
                String googleId = String.valueOf(attributes.getOrDefault("sub", ""));
                String email = String.valueOf(attributes.getOrDefault("email", ""));
                boolean emailVerified = Boolean.TRUE.equals(attributes.get("email_verified"))
                        || "true".equalsIgnoreCase(String.valueOf(attributes.get("email_verified")));

                if (googleId.isBlank() || email.isBlank()) {
                    throw new ProviderIdentityException("Google did not provide a primary identity or email; sign-in unavailable");
                }
                if (!emailVerified) {
                    throw new ProviderIdentityException("Your Google email is not verified; sign-in unavailable");
                }

                return userRepository.findByProviderAndProviderId(Provider.GOOGLE, googleId)
                        .orElseGet(() -> findOrCreateByEmail(Provider.GOOGLE, googleId, email, nameOf(attributes), pictureOf(attributes)));
            }

            case "github" -> {
                String githubId = String.valueOf(attributes.getOrDefault("id", ""));
                String name = String.valueOf(attributes.getOrDefault("login", ""));
                String image = String.valueOf(attributes.getOrDefault("avatar_url", ""));

                String email = (String) attributes.get("email");
                String resolvedEmail = (email == null || email.isBlank()) ? name + "@github.com" : email;
                if (githubId.isBlank()) {
                    throw new ProviderIdentityException("GitHub did not provide a primary identity; sign-in unavailable");
                }

                return userRepository.findByProviderAndProviderId(Provider.GITHUB, githubId)
                        .orElseGet(() -> findOrCreateByEmail(Provider.GITHUB, githubId, resolvedEmail, name, image));
            }

            default -> throw new ProviderIdentityException("Unsupported OAuth provider: " + registrationId);
        }
    }

    private User findOrCreateByEmail(Provider provider, String providerId, String email, String name, String image) {
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            User account = existing.get();
            if (account.getProvider() == provider) {
                // Same provider, fresh provider id: benign re-link of the verified identity.
                account.setProviderId(providerId);
                return userRepository.save(account);
            }
            throw new ProviderIdentityException(
                    "An account with this email already exists under a different provider; "
                            + "sign in with that provider instead. Accounts are never merged automatically.");
        }

        User newUser = User.builder()
                .email(email)
                .name(name)
                .image(image)
                .enabled(true)
                .provider(provider)
                .providerId(providerId)
                .build();
        return userRepository.save(newUser);
    }

    private static String nameOf(Map<String, Object> attributes) {
        Object name = attributes.get("name");
        return name != null ? name.toString() : "";
    }

    private static String pictureOf(Map<String, Object> attributes) {
        Object picture = attributes.get("picture");
        return picture != null ? picture.toString() : "";
    }
}