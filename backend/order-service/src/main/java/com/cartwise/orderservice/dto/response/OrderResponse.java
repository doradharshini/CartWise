package com.cartwise.orderservice.dto.response;

import com.cartwise.orderservice.entity.OrderLineItem;
import com.cartwise.orderservice.entity.ShippingAddress;
import com.cartwise.orderservice.enums.OrderStatus;
import com.cartwise.orderservice.enums.PaymentMethod;
import com.cartwise.orderservice.enums.PaymentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
    private UUID id;
    private String orderNumber;
    private String userId;
    private List<OrderLineItem> orderLineItems;
    private BigDecimal totalPrice;
    private LocalDateTime createdAt;
    private OrderStatus orderStatus;
    private PaymentStatus paymentStatus;
    private PaymentMethod paymentMethod;
    private ShippingAddress shippingAddress;
}