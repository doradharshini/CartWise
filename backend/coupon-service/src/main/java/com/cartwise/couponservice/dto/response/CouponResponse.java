package com.cartwise.couponservice.dto.response;

import com.cartwise.couponservice.entity.DiscountType;

import java.math.BigDecimal;

public record CouponResponse(
        String code,
        DiscountType discountType,
        BigDecimal discountValue
) {
}