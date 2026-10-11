package com.pt.pathio.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pt.pathio.auth.entity.Provider;
import com.pt.pathio.auth.entity.RefreshToken;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.repository.UserRepository;
import com.pt.pathio.auth.security.CookieService;
import com.pt.pathio.auth.security.JwtService;
import com.pt.pathio.auth.security.OAuth2FailureHandler;
import com.pt.pathio.auth.security.OAuth2SuccessHandler;
import com.pt.pathio.auth.service.RefreshTokenService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2UserAuthority;

import java.time.Instant;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class OAuthPopupSecurityTest {

    private static final String ORIGINS = "http://localhost:3000,http://localhost:3001";

    private User seededUser() {
        return User.builder()
                .id(UUID.randomUUID())
                .email("google_user@gmail.com")
                .name("Google User")
                .provider(Provider.GOOGLE)
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    private OAuth2AuthenticationToken googleToken(Map<String, Object> attributes) {
        DefaultOAuth2User oauthUser = new DefaultOAuth2User(
                List.of(new OAuth2UserAuthority(attributes)),
                attributes,
                "sub"
        );
        return new OAuth2AuthenticationToken(
                oauthUser,
                List.of(new OAuth2UserAuthority(attributes)),
                "google"
        );
    }

    private OAuth2SuccessHandler successHandler(
            UserRepository userRepository, JwtService jwtService, CookieService cookieService, RefreshTokenService refreshTokenService
    ) {
        return new OAuth2SuccessHandler(
                userRepository,
                jwtService,
                cookieService,
                refreshTokenService,
                new ObjectMapper(),
                ORIGINS
        );
    }

    @Test
    @DisplayName("OAuth2SuccessHandler targets authorized origins, NEVER uses '*', and never leaks the refresh token")
    void testOAuthSuccessHandlerUsesSpecificOriginsAndHidesRefreshToken() throws Exception {
        UserRepository userRepository = mock(UserRepository.class);
        JwtService jwtService = mock(JwtService.class);
        CookieService cookieService = mock(CookieService.class);
        RefreshTokenService refreshTokenService = mock(RefreshTokenService.class);

        User mockUser = seededUser();
        when(userRepository.findByProviderAndProviderId(Provider.GOOGLE, "12345"))
                .thenReturn(Optional.of(mockUser));
        when(jwtService.getRefreshTtlSeconds()).thenReturn(2592000L);
        when(jwtService.getAccessTtlSeconds()).thenReturn(3600L);
        when(jwtService.generateAccessToken(any())).thenReturn("mock-access-token");
        when(jwtService.generateRefreshToken(any(), anyString())).thenReturn("mock-refresh-token");
        when(refreshTokenService.issue(any())).thenReturn(RefreshToken.builder()
                .jti("jti-1")
                .familyId(UUID.randomUUID())
                .user(mockUser)
                .revoked(false)
                .build());

        OAuth2SuccessHandler handler = successHandler(userRepository, jwtService, cookieService, refreshTokenService);

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        Map<String, Object> attributes = Map.of(
                "sub", "12345",
                "email", "google_user@gmail.com",
                "email_verified", true,
                "name", "Google User",
                "picture", "https://avatar.google.com/pic"
        );

        handler.onAuthenticationSuccess(request, response, googleToken(attributes));

        String responseContent = response.getContentAsString();

        // 1. Must NOT contain wildcard targetOrigin '*'
        assertThat(responseContent).doesNotContain("'*'");
        assertThat(responseContent).doesNotContain("\"*\"");

        // 2. Must contain authorized origins
        assertThat(responseContent).contains("http://localhost:3000");
        assertThat(responseContent).contains("http://localhost:3001");
        assertThat(responseContent).contains("window.opener.postMessage");
        assertThat(responseContent).contains("OAUTH_AUTH_SUCCESS");

        // 3. SEC-02: the refresh token must never reach the popup postMessage.
        assertThat(responseContent).doesNotContain("refreshToken");
        assertThat(responseContent).doesNotContain("mock-refresh-token");
    }

    @Test
    @DisplayName("Unverified Google email is rejected with OAUTH_AUTH_FAILURE and no session cookie")
    void testGoogleUnverifiedEmailIsRejected() throws Exception {
        UserRepository userRepository = mock(UserRepository.class);
        JwtService jwtService = mock(JwtService.class);
        CookieService cookieService = mock(CookieService.class);
        RefreshTokenService refreshTokenService = mock(RefreshTokenService.class);

        OAuth2SuccessHandler handler = successHandler(userRepository, jwtService, cookieService, refreshTokenService);

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        Map<String, Object> attributes = Map.of(
                "sub", "777",
                "email", "attacker@gmail.com",
                "email_verified", false,
                "name", "Attacker",
                "picture", ""
        );

        handler.onAuthenticationSuccess(request, response, googleToken(attributes));

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("OAUTH_AUTH_FAILURE");
        assertThat(response.getContentAsString()).contains("not verified");
        assertThat(response.getHeaders(HttpHeaders.SET_COOKIE)).isEmpty();
        verify(userRepository, never()).save(any());
        verify(refreshTokenService, never()).issue(any());
    }

    @Test
    @DisplayName("Email collision with a different provider is rejected explicitly, never silently merged")
    void testCrossProviderEmailCollisionIsRejected() throws Exception {
        UserRepository userRepository = mock(UserRepository.class);
        JwtService jwtService = mock(JwtService.class);
        CookieService cookieService = mock(CookieService.class);
        RefreshTokenService refreshTokenService = mock(RefreshTokenService.class);

        // Existing GITHUB account owns the email; the Google login tries to take it over.
        User existingGithub = User.builder()
                .id(UUID.randomUUID())
                .email("shared@example.com")
                .name("GitHub User")
                .provider(Provider.GITHUB)
                .enabled(true)
                .build();
        when(userRepository.findByProviderAndProviderId(Provider.GOOGLE, "555"))
                .thenReturn(Optional.empty());
        when(userRepository.findByEmail("shared@example.com"))
                .thenReturn(Optional.of(existingGithub));

        OAuth2SuccessHandler handler = successHandler(userRepository, jwtService, cookieService, refreshTokenService);

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        Map<String, Object> attributes = Map.of(
                "sub", "555",
                "email", "shared@example.com",
                "email_verified", true,
                "name", "Google User",
                "picture", ""
        );

        handler.onAuthenticationSuccess(request, response, googleToken(attributes));

        assertThat(response.getStatus()).isEqualTo(401);
        String content = response.getContentAsString();
        assertThat(content).contains("OAUTH_AUTH_FAILURE");
        assertThat(content).contains("different provider");
        assertThat(response.getHeaders(HttpHeaders.SET_COOKIE)).isEmpty();
        verify(userRepository, never()).save(any());
        verify(refreshTokenService, never()).issue(any());
    }

    @Test
    @DisplayName("OAuth2FailureHandler cleanly notifies authorized origins and closes popup")
    void testOAuthFailureHandlerNotifiesAuthorizedOrigins() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        OAuth2FailureHandler failureHandler = new OAuth2FailureHandler(
                objectMapper,
                ORIGINS
        );

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        failureHandler.onAuthenticationFailure(request, response, new BadCredentialsException("OAuth login failed"));

        String responseContent = response.getContentAsString();

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(responseContent).doesNotContain("'*'");
        assertThat(responseContent).contains("OAUTH_AUTH_FAILURE");
        assertThat(responseContent).contains("http://localhost:3000");
        assertThat(responseContent).contains("window.close()");
    }
}