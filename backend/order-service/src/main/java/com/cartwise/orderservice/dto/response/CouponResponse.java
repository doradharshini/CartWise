package com.cartwise.orderservice.dto.response;


import com.cartwise.orderservice.enums.DiscountType;

import java.math.BigDecimal;

public record CouponResponse(
        String code,
        DiscountType discountType,
        BigDecimal discountValue
) {
}