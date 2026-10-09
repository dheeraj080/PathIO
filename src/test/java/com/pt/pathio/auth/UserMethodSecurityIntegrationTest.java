package com.pt.pathio.auth;

import com.pt.pathio.auth.controller.UserController;
import com.pt.pathio.auth.dto.UserDTO;
import com.pt.pathio.auth.entity.Provider;
import com.pt.pathio.auth.entity.Role;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.repository.RoleRepository;
import com.pt.pathio.auth.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@Transactional
class UserMethodSecurityIntegrationTest {

    @Autowired
    private UserController userController;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User adminUser;
    private User normalUser;
    private User otherUser;

    private UserPrincipal adminPrincipal;
    private UserPrincipal normalPrincipal;

    @BeforeEach
    void setUp() {
        Role roleAdmin = roleRepository.findByName("ROLE_ADMIN")
                .orElseGet(() -> roleRepository.save(new Role(UUID.randomUUID(), "ROLE_ADMIN")));
        Role roleUser = roleRepository.findByName("ROLE_USER")
                .orElseGet(() -> roleRepository.save(new Role(UUID.randomUUID(), "ROLE_USER")));

        adminUser = userRepository.save(User.builder()
                .email("admin_" + UUID.randomUUID() + "@example.com")
                .name("Admin User")
                .password(passwordEncoder.encode("AdminPass123!"))
                .provider(Provider.LOCAL)
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .roles(Set.of(roleAdmin, roleUser))
                .build());

        normalUser = userRepository.save(User.builder()
                .email("normal_" + UUID.randomUUID() + "@example.com")
                .name("Normal User")
                .password(passwordEncoder.encode("NormalPass123!"))
                .provider(Provider.LOCAL)
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .roles(Set.of(roleUser))
                .build());

        otherUser = userRepository.save(User.builder()
                .email("other_" + UUID.randomUUID() + "@example.com")
                .name("Other User")
                .password(passwordEncoder.encode("OtherPass123!"))
                .provider(Provider.LOCAL)
                .enabled(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .roles(Set.of(roleUser))
                .build());

        adminPrincipal = new UserPrincipal(adminUser.getId(), adminUser.getEmail());
        normalPrincipal = new UserPrincipal(normalUser.getId(), normalUser.getEmail());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAsAdmin() {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                adminPrincipal,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"), new SimpleGrantedAuthority("ROLE_USER"))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private void authenticateAsNormalUser() {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                normalPrincipal,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("ROLE_ADMIN has access to user list, get by email, create, and delete other user")
    void testAdminAccessAllowed() {
        authenticateAsAdmin();

        // 1. Admin gets list
        ResponseEntity<Iterable<UserDTO>> listResponse = userController.getAllUsers();
        assertThat(listResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        // 2. Admin gets by email
        ResponseEntity<UserDTO> emailResponse = userController.getUserByEmail(normalUser.getEmail());
        assertThat(emailResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        // 3. Admin creates user
        UserDTO newDto = UserDTO.builder()
                .name("Created By Admin")
                .email("admin_created_" + UUID.randomUUID() + "@example.com")
                .password("Password123!")
                .build();
        ResponseEntity<UserDTO> createResponse = userController.createUser(newDto);
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        // 4. Admin deletes other user
        userController.deleteUser(otherUser.getId().toString(), adminPrincipal);
        assertThat(userRepository.existsById(otherUser.getId())).isFalse();
    }

    @Test
    @DisplayName("Admin is blocked from deleting themselves -> AccessDeniedException")
    void testAdminBlockedFromDeletingThemselves() {
        authenticateAsAdmin();

        assertThatThrownBy(() -> userController.deleteUser(adminUser.getId().toString(), adminPrincipal))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("Admins cannot delete their own account");
    }

    @Test
    @DisplayName("Normal user is blocked from admin-only endpoints -> AccessDeniedException")
    void testNormalUserBlockedFromAdminEndpoints() {
        authenticateAsNormalUser();

        // GET list -> 403 AccessDeniedException
        assertThatThrownBy(() -> userController.getAllUsers())
                .isInstanceOf(AccessDeniedException.class);

        // GET by email -> 403 AccessDeniedException
        assertThatThrownBy(() -> userController.getUserByEmail(otherUser.getEmail()))
                .isInstanceOf(AccessDeniedException.class);

        // POST create -> 403 AccessDeniedException
        UserDTO newDto = UserDTO.builder()
                .name("Attempt")
                .email("attempt_" + UUID.randomUUID() + "@example.com")
                .password("Password123!")
                .build();
        assertThatThrownBy(() -> userController.createUser(newDto))
                .isInstanceOf(AccessDeniedException.class);

        // DELETE other user -> 403 AccessDeniedException
        assertThatThrownBy(() -> userController.deleteUser(otherUser.getId().toString(), normalPrincipal))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Normal user can view and update themselves, but gets AccessDeniedException for other users")
    void testNormalUserSelfAccessAllowedOthersForbidden() {
        authenticateAsNormalUser();

        // 1. Normal user GET own ID -> OK
        ResponseEntity<UserDTO> selfResponse = userController.getUserById(normalUser.getId().toString());
        assertThat(selfResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(selfResponse.getBody().getId()).isEqualTo(normalUser.getId());

        // 2. Normal user PUT own ID -> OK
        UserDTO updateDto = UserDTO.builder()
                .name("Normal User Renamed")
                .build();
        ResponseEntity<UserDTO> updateResponse = userController.updateUser(updateDto, normalUser.getId().toString());
        assertThat(updateResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(updateResponse.getBody().getName()).isEqualTo("Normal User Renamed");

        // 3. Normal user GET other user ID -> AccessDeniedException
        assertThatThrownBy(() -> userController.getUserById(otherUser.getId().toString()))
                .isInstanceOf(AccessDeniedException.class);

        // 4. Normal user PUT other user ID -> AccessDeniedException
        assertThatThrownBy(() -> userController.updateUser(updateDto, otherUser.getId().toString()))
                .isInstanceOf(AccessDeniedException.class);
    }
}
