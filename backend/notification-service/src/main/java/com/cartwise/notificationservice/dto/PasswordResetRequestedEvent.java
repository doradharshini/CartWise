package com.cartwise.notificationservice.dto;

public record PasswordResetRequestedEvent(
        String email,
        String firstName,
        String otpToken
) {
}