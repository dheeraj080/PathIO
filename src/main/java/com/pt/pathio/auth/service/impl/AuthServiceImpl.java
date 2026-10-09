package com.pt.pathio.auth.service.impl;

import com.pt.pathio.auth.dto.UserDTO;
import com.pt.pathio.auth.repository.UserRepository;
import com.pt.pathio.auth.service.AuthService;
import com.pt.pathio.auth.service.UserService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.regex.Pattern;

@Service
@AllArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserService userService;
    private final UserRepository userRepository;

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    @Override
    public UserDTO registerUser(UserDTO userDTO) {
        if (userDTO.getEmail() == null || userDTO.getEmail().isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }

        String rawEmail = userDTO.getEmail().trim();
        if (!EMAIL_PATTERN.matcher(rawEmail).matches()) {
            throw new IllegalArgumentException("Invalid email format");
        }

        if (userDTO.getPassword() == null || userDTO.getPassword().isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }

        if (userDTO.getPassword().length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters");
        }

        String normalizedEmail = rawEmail.toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new IllegalArgumentException("Email already exists");
        }

        userDTO.setEmail(normalizedEmail);
        return userService.createUser(userDTO);
    }
}