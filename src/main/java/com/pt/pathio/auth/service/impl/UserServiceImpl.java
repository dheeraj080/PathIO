package com.pt.pathio.auth.service.impl;

import com.pt.pathio.auth.dto.UserDTO;
import com.pt.pathio.auth.entity.Provider;
import com.pt.pathio.auth.entity.Role;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.exception.ResourceNotFoundException;
import com.pt.pathio.auth.helper.UserHelper;
import com.pt.pathio.auth.repository.RoleRepository;
import com.pt.pathio.auth.repository.UserRepository;
import com.pt.pathio.auth.service.UserService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final ModelMapper modelMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public UserDTO createUser(UserDTO userDTO) {
        // Validation is handled in AuthServiceImpl.

        // 1. Map DTO to Entity
        User user = modelMapper.map(userDTO, User.class);

        // 2. Security & Defaults — users are active immediately (no email verification)
        user.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        user.setProvider(userDTO.getProvider() != null ? userDTO.getProvider() : Provider.LOCAL);
        user.setEnabled(true);

        // 3. Assign Default Role
        Role defaultRole = roleRepository.findByName("ROLE_USER")
                .orElseThrow(() -> new ResourceNotFoundException("Default Role 'ROLE_USER' not found"));
        user.setRoles(Collections.singleton(defaultRole));

        // 4. Persistence
        User savedUser = userRepository.save(user);
        log.info("User registered and activated: {}", savedUser.getEmail());

        return modelMapper.map(savedUser, UserDTO.class);
    }

    @Override
    public UserDTO getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return modelMapper.map(user, UserDTO.class);
    }

    @Override
    @Transactional
    public UserDTO updateUser(UserDTO userDTO, String userId) {
        UUID uId = UserHelper.parseUUID(userId);
        User existingUser = userRepository.findById(uId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));

        if (userDTO.getName() != null) existingUser.setName(userDTO.getName());
        if (userDTO.getImage() != null) existingUser.setImage(userDTO.getImage());
        if (userDTO.getProvider() != null) existingUser.setProvider(userDTO.getProvider());

        if (userDTO.getPassword() != null && !userDTO.getPassword().isBlank()) {
            existingUser.setPassword(passwordEncoder.encode(userDTO.getPassword()));

        }


        // FIX: Changed 'user' to 'existingUser'
        if (userDTO.getEnabled() != null) {
            existingUser.setEnabled(userDTO.getEnabled());
        }

        User updatedUser = userRepository.save(existingUser);
        return modelMapper.map(updatedUser, UserDTO.class);
    }

    @Override
    public void deleteUser(String userId) {
        UUID uId = UserHelper.parseUUID(userId);
        if (!userRepository.existsById(uId)) {
            throw new ResourceNotFoundException("User not found with ID: " + userId);
        }
        userRepository.deleteById(uId);
    }

    @Override
    public UserDTO getUserById(String userId) {
        UUID uId = UserHelper.parseUUID(userId);
        User user = userRepository.findById(uId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + userId));
        return modelMapper.map(user, UserDTO.class);
    }

    @Override
    public Iterable<UserDTO> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(user -> modelMapper.map(user, UserDTO.class))
                .collect(Collectors.toList());
    }
}