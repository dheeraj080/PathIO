package com.pt.pathio.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pt.pathio.auth.entity.Provider;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.repository.RefreshTokenRepository;
import com.pt.pathio.auth.repository.UserRepository;
import com.pt.pathio.auth.security.CookieService;
import com.pt.pathio.auth.security.JwtService;
import com.pt.pathio.auth.security.OAuth2FailureHandler;
import com.pt.pathio.auth.security.OAuth2SuccessHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
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

    @Test
    @DisplayName("OAuth2SuccessHandler targets authorized origins and NEVER uses wildcard '*'")
    void testOAuthSuccessHandlerUsesSpecificOrigins() throws Exception {
        UserRepository userRepository = mock(UserRepository.class);
        JwtService jwtService = mock(JwtService.class);
        CookieService cookieService = mock(CookieService.class);
        RefreshTokenRepository refreshTokenRepository = mock(RefreshTokenRepository.class);
        ObjectMapper objectMapper = new ObjectMapper();

        String authorizedOriginsStr = "http://localhost:3000,http://localhost:3001";
        OAuth2SuccessHandler handler = new OAuth2SuccessHandler(
                userRepository,
                jwtService,
                cookieService,
                refreshTokenRepository,
                objectMapper,
                authorizedOriginsStr
        );

        User mockUser = User.builder()
                .id(UUID.randomUUID())
                .email("google_user@gmail.com")
                .name("Google User")
                .provider(Provider.GOOGLE)
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        when(userRepository.findByEmail(anyString())).thenReturn(Optional.of(mockUser));
        when(jwtService.getRefreshTtlSeconds()).thenReturn(2592000L);
        when(jwtService.getAccessTtlSeconds()).thenReturn(3600L);
        when(jwtService.generateAccessToken(any())).thenReturn("mock-access-token");
        when(jwtService.generateRefreshToken(any(), anyString())).thenReturn("mock-refresh-token");

        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        Map<String, Object> attributes = Map.of(
                "sub", "12345",
                "email", "google_user@gmail.com",
                "name", "Google User",
                "picture", "https://avatar.google.com/pic"
        );
        DefaultOAuth2User oauthUser = new DefaultOAuth2User(
                List.of(new OAuth2UserAuthority(attributes)),
                attributes,
                "sub"
        );
        OAuth2AuthenticationToken authToken = new OAuth2AuthenticationToken(
                oauthUser,
                List.of(new OAuth2UserAuthority(attributes)),
                "google"
        );

        handler.onAuthenticationSuccess(request, response, authToken);

        String responseContent = response.getContentAsString();

        // 1. Must NOT contain wildcard targetOrigin '*'
        assertThat(responseContent).doesNotContain("'*'");
        assertThat(responseContent).doesNotContain("\"*\"");

        // 2. Must contain authorized origins
        assertThat(responseContent).contains("http://localhost:3000");
        assertThat(responseContent).contains("http://localhost:3001");
        assertThat(responseContent).contains("window.opener.postMessage");
        assertThat(responseContent).contains("OAUTH_AUTH_SUCCESS");
    }

    @Test
    @DisplayName("OAuth2FailureHandler cleanly notifies authorized origins and closes popup")
    void testOAuthFailureHandlerNotifiesAuthorizedOrigins() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        OAuth2FailureHandler failureHandler = new OAuth2FailureHandler(
                objectMapper,
                "http://localhost:3000,http://localhost:3001"
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
