package com.cartwise.orderservice.dto.response;

import java.math.BigDecimal;

public record SkuSummaryResponse(
        String skuCode,
        int quantitySold,
        BigDecimal revenue
) {
}