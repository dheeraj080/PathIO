package com.pt.pathio.auth.security;

import com.pt.pathio.auth.entity.Provider;
import com.pt.pathio.auth.entity.RefreshToken;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.repository.RefreshTokenRepository;
import com.pt.pathio.auth.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final Logger logger = LoggerFactory.getLogger(this.getClass());
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final CookieService cookieService;
    private final RefreshTokenRepository refreshTokenRepository;

//    @Value("${app.auth.frontend.success-redirect}")
//    private String frontEndSuccessUrl;

    public OAuth2SuccessHandler(UserRepository userRepository, JwtService jwtService, CookieService cookieService, RefreshTokenRepository refreshTokenRepository) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.cookieService = cookieService;
        this.refreshTokenRepository = refreshTokenRepository;
    }


    @Override
    @Transactional
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        logger.info("Successful authentication");
        logger.info(authentication.toString());


        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        //identify user:

        String registrationId = "unknown";
        if (authentication instanceof OAuth2AuthenticationToken token) {
            registrationId = token.getAuthorizedClientRegistrationId();
        }

        logger.info("registrationId:" + registrationId);
        logger.info("user:" + oAuth2User.getAttributes().toString());

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

            default -> {
                throw new RuntimeException("Invalid registration id");
            }

        }


        //username
        //user email
        //new usercreate


        //jwt token__ token ke sath front -- pe fir redirect.

        //refresh:
//        user--> refresh token unko revoke

//        refresh token bana ke dunga:
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

        // Return HTML to post message to frontend popup opener
        response.setContentType("text/html");

        // Manual JSON construction to avoid adding Jackson ObjectMapper to constructor if not already there
        String userJson = String.format("{\"id\":\"%s\",\"email\":\"%s\",\"name\":\"%s\",\"image\":\"%s\"}",
                user.getId(), user.getEmail(), user.getName() != null ? user.getName().replace("\"", "\\\"") : "",
                user.getImage() != null ? user.getImage().replace("\"", "\\\"") : "");

        String payloadJson = String.format("{\"accessToken\":\"%s\",\"refreshToken\":\"%s\",\"expiresIn\":%d,\"user\":%s}",
                accessToken, refreshToken, jwtService.getAccessTtlSeconds(), userJson);

        String html = "<!DOCTYPE html><html><body><script>"
                + "window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', payload: " + payloadJson + " }, '*');"
                + "window.close();"
                + "</script></body></html>";

        response.getWriter().write(html);
    }
}