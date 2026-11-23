package com.cartwise.notificationservice.dto;

public record EmailVerificationRequestedEvent(
        String email,
        String firstName,
        String otpToken
) {
}