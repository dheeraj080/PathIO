package com.pt.pathio.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Session response. Contains only the in-memory access token; the refresh token is delivered
 * exclusively through the HttpOnly cookie so it can never be read by frontend JavaScript (SEC-02).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record TokenResponse(
        String accessToken,
        Long expiresIn,
        String tokenType,
        UserDTO user
) {
    public static TokenResponse of(String accessToken, long expiresIn, UserDTO user) {
        return new TokenResponse(accessToken, expiresIn, "Bearer", user);
    }
}