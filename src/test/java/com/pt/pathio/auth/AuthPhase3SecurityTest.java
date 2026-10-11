package com.pt.pathio.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pt.pathio.auth.entity.Provider;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.repository.UserRepository;
import com.pt.pathio.entity.UrlEntity;
import com.pt.pathio.repository.UrlRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.admin.email=envadmin@pathio.test",
        "app.admin.password=AdminPass123!"
})
@Transactional
@ActiveProfiles("test")
class AuthPhase3SecurityTest {

    private static final String ADMIN_EMAIL = "envadmin@pathio.test";
    private static final String ADMIN_PASSWORD = "AdminPass123!";

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UrlRepository urlRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private MockMvc mockMvc;
    private User oauthUser;
    private User localNonAdmin;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();

        oauthUser = userRepository.save(User.builder()
                .email("p3_oauth_" + UUID.randomUUID() + "@example.com")
                .name("OAuth User")
                .provider(Provider.GOOGLE)
                .providerId("google-" + UUID.randomUUID())
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());

        localNonAdmin = userRepository.save(User.builder()
                .email("p3_local_" + UUID.randomUUID() + "@example.com")
                .name("Local Non Admin")
                .password(passwordEncoder.encode("LocalPass123!"))
                .provider(Provider.LOCAL)
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build());
    }

    private RequestPostProcessor as(User user) {
        return authentication(new UsernamePasswordAuthenticationToken(
                new UserPrincipal(user.getId(), user.getEmail()), null, user.getAuthorities()));
    }

    @Test
    @DisplayName("Anonymous POST /api/v1/shorten is rejected with 401")
    void anonymousShortenRejected() throws Exception {
        mockMvc.perform(post("/api/v1/shorten")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"longUrl\":\"https://example.com/anon\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Authenticated OAuth user can shorten and the link is owned by them")
    void authenticatedShortenSucceeds() throws Exception {
        String body = mockMvc.perform(post("/api/v1/shorten")
                        .with(as(oauthUser))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"longUrl\":\"https://example.com/owned\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String shortUrl = objectMapper.readTree(body).get("shortUrl").asText();
        String shortCode = shortUrl.substring(shortUrl.lastIndexOf('/') + 1);

        UrlEntity entity = urlRepository.findByShortCode(shortCode).orElseThrow();
        assertThat(entity.getUser()).isNotNull();
        assertThat(entity.getUser().getId()).isEqualTo(oauthUser.getId());
    }

    @Test
    @DisplayName("Local non-admin password login is refused with 403 OAUTH_ONLY")
    void localNonAdminLoginForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + localNonAdmin.getEmail()
                                + "\",\"password\":\"LocalPass123!\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("OAUTH_ONLY"));
    }

    @Test
    @DisplayName("Env-provisioned local admin can still log in with a password")
    void envAdminLoginSucceeds() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + ADMIN_EMAIL
                                + "\",\"password\":\"" + ADMIN_PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    @Test
    @DisplayName("Registration endpoint has been removed (404)")
    void registerRemoved() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"x@example.com\",\"password\":\"Password123!\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Public redirect still works for anonymous visitors (302 Location)")
    void publicRedirectWorks() throws Exception {
        UrlEntity entity = urlRepository.save(UrlEntity.builder()
                .id(System.nanoTime())
                .longUrl("https://example.com/public-target")
                .shortCode("p3pub" + UUID.randomUUID().toString().replace("-", "").substring(0, 10))
                .clickCount(0L)
                .user(oauthUser)
                .build());

        mockMvc.perform(get("/api/v1/" + entity.getShortCode()))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://example.com/public-target"));
    }
}
