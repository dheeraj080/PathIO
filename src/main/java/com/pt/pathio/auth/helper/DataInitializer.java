package com.pt.pathio.auth.helper;

import com.pt.pathio.auth.entity.Role;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.repository.RoleRepository;
import com.pt.pathio.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:}")
    private String adminEmail;

    @Value("${app.admin.password:}")
    private String adminPassword;

    @Override
    public void run(String @NonNull ... args) {
        if (roleRepository.count() == 0) {
            roleRepository.save(new Role(UUID.randomUUID(), "ROLE_USER"));
            roleRepository.save(new Role(UUID.randomUUID(), "ROLE_ADMIN"));
            System.out.println("✅ Default roles initialized.");
        }

        if (adminEmail != null && !adminEmail.isBlank() && adminPassword != null && !adminPassword.isBlank()) {
            if (userRepository.findByEmail(adminEmail).isEmpty()) {
                Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                        .orElseThrow(() -> new RuntimeException("ROLE_ADMIN not initialized"));
                Role userRole = roleRepository.findByName("ROLE_USER")
                        .orElseThrow(() -> new RuntimeException("ROLE_USER not initialized"));

                User admin = User.builder()
                        .name("System Administrator")
                        .email(adminEmail)
                        .password(passwordEncoder.encode(adminPassword))
                        .enabled(true)
                        .roles(Set.of(adminRole, userRole))
                        .build();

                userRepository.save(admin);
                System.out.println("✅ System Administrator account auto-created: " + adminEmail);
            }
        }
    }
}