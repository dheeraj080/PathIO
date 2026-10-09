package com.pt.pathio.auth.controller;

import com.pt.pathio.auth.UserPrincipal;
import com.pt.pathio.auth.dto.UserDTO;
import com.pt.pathio.auth.service.UserService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@AllArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> createUser(@RequestBody UserDTO userDTO) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createUser(userDTO));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Iterable<UserDTO>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN') or (principal != null and principal.id().toString().equalsIgnoreCase(#userId))")
    public ResponseEntity<UserDTO> getUserById(@PathVariable String userId) {
        return ResponseEntity.ok(userService.getUserById(userId));
    }

    @GetMapping("/email/{email}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> getUserByEmail(@PathVariable String email) {
        return ResponseEntity.ok(userService.getUserByEmail(email));
    }

    @PutMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN') or (principal != null and principal.id().toString().equalsIgnoreCase(#userId))")
    public ResponseEntity<UserDTO> updateUser(@RequestBody UserDTO userDTO, @PathVariable String userId) {
        return ResponseEntity.ok(userService.updateUser(userDTO, userId));
    }

    @DeleteMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(
            @PathVariable String userId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal != null && principal.id().toString().equalsIgnoreCase(userId)) {
            throw new AccessDeniedException("Admins cannot delete their own account");
        }
        userService.deleteUser(userId);
    }
}