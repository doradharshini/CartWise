package com.cartwise.cartservice.dto.response;

import java.math.BigDecimal;

public record ProductResponse(
        String skuCode,
        String name,
        BigDecimal price) {
}