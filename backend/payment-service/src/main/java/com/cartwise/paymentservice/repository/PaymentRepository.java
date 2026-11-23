package com.cartwise.paymentservice.repository;

import com.cartwise.paymentservice.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, String> {
    Optional<Payment> findByOrderId(String orderId);

    Optional<Payment> findByPaymentGatewayTransactionId(String transactionId);
}