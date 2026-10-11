package com.pt.pathio.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pt.pathio.auth.dto.TokenResponse;
import com.pt.pathio.auth.dto.UserDTO;
import com.pt.pathio.auth.entity.Provider;
import com.pt.pathio.auth.entity.Role;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.repository.RoleRepository;
import com.pt.pathio.auth.repository.UserRepository;
import com.pt.pathio.auth.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Transactional
@ActiveProfiles("test")
class UserSecurityAndDtoTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        if (roleRepository.findByName("ROLE_USER").isEmpty()) {
            roleRepository.save(new Role(UUID.randomUUID(), "ROLE_USER"));
        }
    }

    @Test
    @DisplayName("Registration accepts password and encodes it, but response JSON never contains password")
    void testRegistrationPasswordNotExposedInJson() throws Exception {
        UserDTO inputDto = UserDTO.builder()
                .name("Alice")
                .email("alice_" + UUID.randomUUID() + "@example.com")
                .password("SuperSecret123!")
                .image("https://example.com/alice.png")
                .build();

        UserDTO createdDto = userService.createUser(inputDto);

        // 1. Verify entity has BCrypt-encoded password in database
        User persistedUser = userRepository.findById(createdDto.getId()).orElseThrow();
        assertThat(persistedUser.getPassword()).isNotEqualTo("SuperSecret123!");
        assertThat(passwordEncoder.matches("SuperSecret123!", persistedUser.getPassword())).isTrue();

        // 2. Verify DTO in-memory has null password
        assertThat(createdDto.getPassword()).isNull();

        // 3. Verify serialized JSON strictly lacks password field
        String json = objectMapper.writeValueAsString(createdDto);
        JsonNode node = objectMapper.readTree(json);
        assertThat(node.has("password")).isFalse();
    }

    @Test
    @DisplayName("User lookup endpoints (ID and Email) never leak password in serialized JSON")
    void testUserLookupNeverLeaksPassword() throws Exception {
        User user = User.builder()
                .email("bob_" + UUID.randomUUID() + "@example.com")
                .name("Bob")
                .password(passwordEncoder.encode("SecretPass999!"))
                .provider(Provider.LOCAL)
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        user = userRepository.save(user);

        UserDTO byId = userService.getUserById(user.getId().toString());
        String byIdJson = objectMapper.writeValueAsString(byId);
        assertThat(objectMapper.readTree(byIdJson).has("password")).isFalse();

        UserDTO byEmail = userService.getUserByEmail(user.getEmail());
        String byEmailJson = objectMapper.writeValueAsString(byEmail);
        assertThat(objectMapper.readTree(byEmailJson).has("password")).isFalse();
    }

    @Test
    @DisplayName("TokenResponse serialization strictly excludes password from embedded UserDTO")
    void testTokenResponseExcludesPassword() throws Exception {
        UserDTO userDto = UserDTO.builder()
                .id(UUID.randomUUID())
                .name("Charlie")
                .email("charlie@example.com")
                .password("AttemptLeakPassword")
                .enabled(true)
                .provider(Provider.LOCAL)
                .build();

        TokenResponse tokenResponse = TokenResponse.of(
                "dummy-access",
                "dummy-refresh",
                3600,
                userDto
        );

        String json = objectMapper.writeValueAsString(tokenResponse);
        JsonNode rootNode = objectMapper.readTree(json);
        assertThat(rootNode.get("user").has("password")).isFalse();
    }

    @Test
    @DisplayName("Profile update cannot modify protected fields (provider, enabled, roles, password)")
    void testProfileUpdateCannotModifyProtectedFields() {
        User user = User.builder()
                .email("dave_" + UUID.randomUUID() + "@example.com")
                .name("Dave Initial")
                .password(passwordEncoder.encode("OriginalPass123!"))
                .provider(Provider.LOCAL)
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        user = userRepository.save(user);

        // Attempt malicious update to change provider, enabled, and password
        UserDTO maliciousUpdate = UserDTO.builder()
                .name("Dave Updated")
                .image("https://example.com/new-pic.png")
                .provider(Provider.GOOGLE)
                .enabled(false)
                .password("HackedPassword123!")
                .build();

        UserDTO result = userService.updateUser(maliciousUpdate, user.getId().toString());

        User afterUpdate = userRepository.findById(user.getId()).orElseThrow();
        // Safe fields updated
        assertThat(afterUpdate.getName()).isEqualTo("Dave Updated");
        assertThat(afterUpdate.getImage()).isEqualTo("https://example.com/new-pic.png");

        // Protected fields UNCHANGED
        assertThat(afterUpdate.getProvider()).isEqualTo(Provider.LOCAL);
        assertThat(afterUpdate.isEnabled()).isTrue();
        assertThat(passwordEncoder.matches("OriginalPass123!", afterUpdate.getPassword())).isTrue();
        assertThat(passwordEncoder.matches("HackedPassword123!", afterUpdate.getPassword())).isFalse();
        assertThat(result.getPassword()).isNull();
    }
}
