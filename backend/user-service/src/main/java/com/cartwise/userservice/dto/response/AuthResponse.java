package com.cartwise.userservice.dto.response;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        Long expiresIn
) {
}