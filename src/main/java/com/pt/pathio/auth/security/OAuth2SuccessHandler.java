package com.pt.pathio.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pt.pathio.auth.entity.Provider;
import com.pt.pathio.auth.entity.RefreshToken;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.repository.RefreshTokenRepository;
import com.pt.pathio.auth.repository.UserRepository;
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
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final Logger logger = LoggerFactory.getLogger(this.getClass());
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final CookieService cookieService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ObjectMapper objectMapper;
    private final List<String> authorizedOrigins;

    public OAuth2SuccessHandler(
            UserRepository userRepository,
            JwtService jwtService,
            CookieService cookieService,
            RefreshTokenRepository refreshTokenRepository,
            ObjectMapper objectMapper,
            @Value("${app.oauth2.authorized-origins:${app.cors.allowed-origins:http://localhost:3000,http://localhost:3001}}") String authorizedOriginsStr
    ) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.cookieService = cookieService;
        this.refreshTokenRepository = refreshTokenRepository;
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
        switch (registrationId) {
            case "google" -> {
                String googleId = oAuth2User.getAttributes().getOrDefault("sub", "").toString();
                String email = oAuth2User.getAttributes().getOrDefault("email", "").toString();
                String name = oAuth2User.getAttributes().getOrDefault("name", "").toString();
                String picture = oAuth2User.getAttributes().getOrDefault("picture", "").toString();
                User newUser = User.builder()
                        .email(email)
                        .name(name)
                        .image(picture)
                        .enabled(true)
                        .provider(Provider.GOOGLE)
                        .providerId(googleId)
                        .build();

                user = userRepository.findByEmail(email).orElseGet(() -> userRepository.save(newUser));
            }

            case "github" -> {
                String name = oAuth2User.getAttributes().getOrDefault("login", "").toString();
                String githubId = oAuth2User.getAttributes().getOrDefault("id", "").toString();
                String image = oAuth2User.getAttributes().getOrDefault("avatar_url", "").toString();

                String email = (String) oAuth2User.getAttributes().get("email");
                if (email == null) {
                    email = name + "@github.com";
                }

                User newUser = User.builder()
                        .email(email)
                        .name(name)
                        .image(image)
                        .enabled(true)
                        .provider(Provider.GITHUB)
                        .providerId(githubId)
                        .build();
                user = userRepository.findByProviderAndProviderId(Provider.GITHUB, githubId)
                        .orElseGet(() -> userRepository.save(newUser));
            }

            default -> throw new RuntimeException("Invalid registration id: " + registrationId);
        }

        String jti = UUID.randomUUID().toString();
        RefreshToken refreshTokenOb = RefreshToken.builder()
                .jti(jti)
                .user(user)
                .revoked(false)
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(jwtService.getRefreshTtlSeconds()))
                .build();

        refreshTokenRepository.save(refreshTokenOb);

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user, refreshTokenOb.getJti());
        cookieService.attachRefreshCookie(response, refreshToken, (int) jwtService.getRefreshTtlSeconds());

        response.setContentType("text/html");

        Map<String, Object> userPayload = Map.of(
                "id", user.getId().toString(),
                "email", user.getEmail(),
                "name", user.getName() != null ? user.getName() : "",
                "image", user.getImage() != null ? user.getImage() : ""
        );

        Map<String, Object> messagePayload = Map.of(
                "type", "OAUTH_AUTH_SUCCESS",
                "payload", Map.of(
                        "accessToken", accessToken,
                        "refreshToken", refreshToken,
                        "expiresIn", jwtService.getAccessTtlSeconds(),
                        "user", userPayload
                )
        );

        String payloadJson = objectMapper.writeValueAsString(messagePayload);
        String originsJson = objectMapper.writeValueAsString(authorizedOrigins);

        String html = "<!DOCTYPE html><html><body><script>"
                + "const allowedOrigins = " + originsJson + ";"
                + "const message = " + payloadJson + ";"
                + "if (window.opener) {"
                + "  allowedOrigins.forEach(origin => {"
                + "    try { window.opener.postMessage(message, origin); } catch (e) {}"
                + "  });"
                + "}"
                + "window.close();"
                + "</script></body></html>";

        response.getWriter().write(html);
    }
}