package com.cartwise.userservice.dto;

public record EmailVerificationRequestedEvent(
        String email,
        String firstName,
        String otpToken
) {
}