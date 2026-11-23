package com.cartwise.orderservice.dto.event;

public record PaymentProcessedEvent(
        String orderId,
        String paymentId,
        String status // "SUCCESS" or "FAILED"
) {
}