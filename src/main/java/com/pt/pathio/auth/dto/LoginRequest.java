package com.pt.pathio.auth.dto;

public record LoginRequest(
        String email,
        String password
) {

}
