package com.pt.pathio.auth.controller;

import com.pt.pathio.auth.dto.LoginRequest;
import com.pt.pathio.auth.dto.TokenResponse;
import com.pt.pathio.auth.dto.UserDTO;
import com.pt.pathio.auth.entity.Provider;
import com.pt.pathio.auth.entity.RefreshToken;
import com.pt.pathio.auth.entity.User;
import com.pt.pathio.auth.exceptions.OAuthOnlyException;
import com.pt.pathio.auth.repository.UserRepository;
import com.pt.pathio.auth.security.CookieService;
import com.pt.pathio.auth.security.JwtService;
import com.pt.pathio.auth.service.RefreshTokenService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final ModelMapper modelMapper;
    private final CookieService cookieService;
    private final RefreshTokenService refreshTokenService;

    @Value("${app.admin.email:}")
    private String adminEmail;

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@RequestBody LoginRequest loginRequest, HttpServletResponse response) {
        // OAuth-only policy: password login is reserved for the env-provisioned local admin.
        // Reject anyone else (OAuth users, self-registered local users) before touching credentials.
        if (loginRequest.email() != null) {
            userRepository.findByEmail(loginRequest.email().trim()).ifPresent(user -> {
                boolean isLocalProvider = user.getProvider() == Provider.LOCAL;
                boolean isEnvAdmin = adminEmail != null
                        && !adminEmail.isBlank()
                        && adminEmail.equalsIgnoreCase(user.getEmail());
                if (!isLocalProvider || !isEnvAdmin) {
                    throw new OAuthOnlyException("Sign in with Google or GitHub");
                }
            });
        }

        // 1. Authenticate via Spring Security
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.email(), loginRequest.password())
        );

        // 2. Fetch user from DB
        User user = userRepository.findByEmail(loginRequest.email())
                .orElseThrow(() -> new BadCredentialsException("User not found after authentication"));

        return generateFullTokenResponse(user, response);
    }

    private ResponseEntity<TokenResponse> generateFullTokenResponse(User user, HttpServletResponse response) {
        // 1. Persist a fresh refresh-token family
        RefreshToken refreshTokenEntity = refreshTokenService.issue(user);

        // 2. Generate the actual JWT strings
        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user, refreshTokenEntity.getJti());

        // 3. Refresh token travels ONLY in the HttpOnly cookie (never in the JSON body, SEC-02)
        cookieService.attachRefreshCookie(response, refreshToken, (int) jwtService.getRefreshTtlSeconds());
        cookieService.addNoStoreHeader(response);

        // 4. Build Response
        UserDTO userDto = modelMapper.map(user, UserDTO.class);
        userDto.setPassword(null);
        return ResponseEntity.ok(TokenResponse.of(accessToken, jwtService.getAccessTtlSeconds(), userDto));
    }

    // renew refresh token
    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refreshToken(HttpServletRequest request, HttpServletResponse response) {
        String refreshToken = readRefreshCookie(request)
                .orElseThrow(() -> new BadCredentialsException("Refresh Token not found"));

        RefreshTokenService.RotationResult result = refreshTokenService.rotate(refreshToken);

        cookieService.attachRefreshCookie(response, result.refreshToken(), (int) jwtService.getRefreshTtlSeconds());
        cookieService.addNoStoreHeader(response);

        UserDTO refreshUserDto = modelMapper.map(result.user(), UserDTO.class);
        refreshUserDto.setPassword(null);
        return ResponseEntity.ok(TokenResponse.of(result.accessToken(), jwtService.getAccessTtlSeconds(), refreshUserDto));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        readRefreshCookie(request).ifPresent(token -> refreshTokenService.revokePresented(token));

        cookieService.clearRefreshCookie(response);
        cookieService.addNoStoreHeader(response);
        SecurityContextHolder.clearContext();
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }

    /**
     * The refresh token is accepted exclusively from the HttpOnly cookie. Body, custom header and
     * Authorization-bearer acceptance was removed (SEC-02) so the credential can never be exposed
     * to or echoed through channels readable by frontend JavaScript.
     */
    private Optional<String> readRefreshCookie(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return Optional.empty();
        }
        return Arrays.stream(request.getCookies())
                .filter(cookie -> cookieService.getRefreshTokenCookieName().equals(cookie.getName()))
                .map(Cookie::getValue)
                .filter(value -> !value.isEmpty())
                .findFirst();
    }
}