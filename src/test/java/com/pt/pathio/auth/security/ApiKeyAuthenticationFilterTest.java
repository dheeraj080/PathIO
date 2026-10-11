package com.pt.pathio.auth.security;

import com.pt.pathio.auth.UserPrincipal;
import com.pt.pathio.auth.entity.ApiKey;
import com.pt.pathio.auth.entity.Role;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.service.ApiKeyService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Headless tests for {@link ApiKeyAuthenticationFilter}: valid keys authenticate the owner,
 * invalid/expired keys fail closed with 401, absent keys pass through, and a Bearer token always
 * takes precedence.
 */
class ApiKeyAuthenticationFilterTest {

    private static final UUID USER_ID = UUID.randomUUID();
    private static final String PLAINTEXT = ApiKeyService.KEY_PREFIX + "abcdefghijklmnopqrstuvwxyz123456";
    private static final String HASH = ApiKeyService.hash(PLAINTEXT);

    private ApiKeyService apiKeyService;
    private ApiKeyAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        apiKeyService = mock(ApiKeyService.class);
        filter = new ApiKeyAuthenticationFilter(apiKeyService);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private User user() {
        return User.builder()
                .id(USER_ID)
                .email("alice@example.com")
                .enabled(true)
                .roles(Set.of(Role.builder().name("ROLE_USER").build()))
                .build();
    }

    private MockHttpServletRequest requestWithApiKey() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(ApiKeyAuthenticationFilter.HEADER, PLAINTEXT);
        return request;
    }

    @Test
    @DisplayName("a valid key authenticates the owner and marks the key used")
    void validKeyAuthenticates() throws Exception {
        ApiKey key = ApiKey.builder()
                .id(1L)
                .user(user())
                .name("ci")
                .keyHash(HASH)
                .active(true)
                .createdAt(Instant.now())
                .build();
        when(apiKeyService.findByKeyHash(HASH)).thenReturn(Optional.of(key));

        MockHttpServletRequest request = requestWithApiKey();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isEqualTo(new UserPrincipal(USER_ID, "alice@example.com"));
        assertThat(auth.getAuthorities().stream().map(a -> a.getAuthority())).contains("ROLE_USER");
        assertThat(request.getAttribute(ApiKeyAuthenticationFilter.ATTR_API_KEY_HASH)).isEqualTo(HASH);
        verify(apiKeyService).markUsed(1L);
        verify(chain).doFilter(request, response);
    }

    @Test
    @DisplayName("an unknown (or revoked) key fails closed with 401")
    void unknownKeyIsUnauthorized() throws Exception {
        when(apiKeyService.findByKeyHash(HASH)).thenReturn(Optional.empty());

        MockHttpServletRequest request = requestWithApiKey();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("Unauthorized");
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(apiKeyService, never()).markUsed(anyLong());
        verify(chain, never()).doFilter(any(ServletRequest.class), any(ServletResponse.class));
    }

    @Test
    @DisplayName("an expired key fails with 401")
    void expiredKeyIsUnauthorized() throws Exception {
        ApiKey key = ApiKey.builder()
                .id(1L)
                .user(user())
                .name("old")
                .keyHash(HASH)
                .active(true)
                .createdAt(Instant.now().minusSeconds(7200))
                .expiresAt(Instant.now().minusSeconds(60))
                .build();
        when(apiKeyService.findByKeyHash(HASH)).thenReturn(Optional.of(key));

        MockHttpServletRequest request = requestWithApiKey();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(apiKeyService, never()).markUsed(anyLong());
        verify(chain, never()).doFilter(any(ServletRequest.class), any(ServletResponse.class));
    }

    @Test
    @DisplayName("requests without X-API-Key pass through unchanged")
    void noHeaderPassesThrough() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(response.getStatus()).isEqualTo(200);
        verify(chain).doFilter(request, response);
        verifyNoInteractions(apiKeyService);
    }

    @Test
    @DisplayName("an existing Bearer authentication takes precedence over the API key")
    void existingAuthenticationWins() throws Exception {
        Authentication existing = mock(Authentication.class);
        SecurityContextHolder.getContext().setAuthentication(existing);

        MockHttpServletRequest request = requestWithApiKey();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isSameAs(existing);
        verifyNoInteractions(apiKeyService);
        verify(chain).doFilter(request, response);
    }

    @Test
    @DisplayName("disabled accounts cannot authenticate with an API key")
    void disabledAccountIsUnauthorized() throws Exception {
        User disabled = User.builder()
                .id(USER_ID)
                .email("alice@example.com")
                .enabled(false)
                .roles(Set.of(Role.builder().name("ROLE_USER").build()))
                .build();
        ApiKey key = ApiKey.builder()
                .id(1L)
                .user(disabled)
                .name("ci")
                .keyHash(HASH)
                .active(true)
                .createdAt(Instant.now())
                .build();
        when(apiKeyService.findByKeyHash(HASH)).thenReturn(Optional.of(key));

        MockHttpServletRequest request = requestWithApiKey();
        MockHttpServletResponse response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(apiKeyService, never()).markUsed(anyLong());
        verify(chain, never()).doFilter(any(ServletRequest.class), any(ServletResponse.class));
    }
}