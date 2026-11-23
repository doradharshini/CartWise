package com.cartwise.userservice.dto.request;

public record PasswordResetRequestedEvent(
        String email,
        String firstName,
        String otpToken
) {
}