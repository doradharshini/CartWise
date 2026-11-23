package com.cartwise.notificationservice.dto;

public record ShippingAddressSnapshot(
        String street,
        String city,
        String state,
        String zipCode,
        String country
) {
}