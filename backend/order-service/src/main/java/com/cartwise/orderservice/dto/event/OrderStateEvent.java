package com.cartwise.orderservice.dto.event;

import java.util.Map;

public record OrderStateEvent(
        String orderNumber,
        Map<String, Integer> skuQuantities
) {
}