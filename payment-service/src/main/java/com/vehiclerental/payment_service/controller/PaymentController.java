package com.vehiclerental.payment_service.controller;

import com.vehiclerental.payment_service.model.Payment;
import com.vehiclerental.payment_service.repository.PaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private PaymentRepository paymentRepository;

    @PostMapping
    public ResponseEntity<?> processPayment(@RequestBody Map<String, Object> paymentRequest) {
        try {
            Long bookingId = ((Number) paymentRequest.get("bookingId")).longValue();
            Double amount = ((Number) paymentRequest.get("amount")).doubleValue();

            Payment payment = new Payment();
            payment.setBookingId(bookingId);
            payment.setAmount(amount);
            payment.setPaymentStatus("SUCCESS");
            payment.setTransactionId("TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            payment.setPaymentDate(LocalDateTime.now());

            Payment savedPayment = paymentRepository.save(payment);
            return ResponseEntity.ok(savedPayment);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Payment processing failed: " + e.getMessage()));
        }
    }

    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<?> getPaymentByBooking(@PathVariable Long bookingId) {
        return paymentRepository.findByBookingId(bookingId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
