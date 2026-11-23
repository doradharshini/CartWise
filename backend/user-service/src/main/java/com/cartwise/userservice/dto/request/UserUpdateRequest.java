package com.cartwise.userservice.dto.request;

public record UserUpdateRequest(
        String firstName,
        String lastName,
        String phoneNumber,
        String email
) {
}