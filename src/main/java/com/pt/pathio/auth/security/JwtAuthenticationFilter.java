package com.pt.pathio.auth.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pt.pathio.auth.UserPrincipal;
import com.pt.pathio.auth.dto.ApiError;
import com.pt.pathio.auth.repository.UserRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String token = authHeader.substring(7);

        try {
            if (!jwtService.isAccessToken(token)) {
                throw new BadCredentialsException("Invalid token type");
            }

            Jws<Claims> parsed = jwtService.parse(token);
            String userId = jwtService.getUserId(token).toString();

            userRepository.findById(UUID.fromString(userId)).ifPresent(user -> {
                if (user.isEnabled() && user.isAccountNonLocked()) {
                    UserPrincipal principal = new UserPrincipal(user.getId(), user.getEmail());

                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(
                                    principal,
                                    null,
                                    user.getAuthorities());

                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            });

            filterChain.doFilter(request, response);

        } catch (ExpiredJwtException e) {
            log.warn("JWT Token expired: {}", e.getMessage());
            // If the endpoint is public (such as /api/v1/shorten), ignore invalid/expired tokens and treat as anonymous
            if (isPublicEndpoint(request)) {
                SecurityContextHolder.clearContext();
                filterChain.doFilter(request, response);
                return;
            }
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized", "Token expired", request.getRequestURI());
        } catch (JwtException | BadCredentialsException | IllegalArgumentException e) {
            log.warn("JWT Validation failed: {}", e.getMessage());
            SecurityContextHolder.clearContext();
            if (isPublicEndpoint(request)) {
                filterChain.doFilter(request, response);
                return;
            }
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized", "Invalid token", request.getRequestURI());
        } catch (Exception e) {
            log.error("Unexpected error in security filter: ", e);
            sendError(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "Internal Server Error", "Internal server error", request.getRequestURI());
        }
    }

    private boolean isPublicEndpoint(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri.equals("/api/v1/shorten") || uri.startsWith("/api/v1/shorten/");
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri.startsWith("/api/v1/auth") ||
                uri.startsWith("/login") ||
                uri.startsWith("/oauth2") ||
                uri.startsWith("/error") ||
                uri.startsWith("/v3/api-docs") ||
                uri.startsWith("/swagger-ui") ||
                uri.startsWith("/api/public");
    }

    private void sendError(HttpServletResponse response, int status, String error, String message, String path)
            throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ApiError apiError = ApiError.of(status, error, message, path);
        objectMapper.writeValue(response.getWriter(), apiError);
    }
}