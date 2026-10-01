package com.vehiclerental.payment_service.controller;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.Utils;
import com.vehiclerental.payment_service.model.Payment;
import com.vehiclerental.payment_service.repository.PaymentRepository;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    @Autowired
    private PaymentRepository paymentRepository;

    @Value("${razorpay.key.id:rzp_test_ThSNqcmLl4lwwN}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret:tcnKiLusawJfT4ZGI3A6vEvH}")
    private String razorpayKeySecret;

    // Config endpoint so frontend can fetch active Razorpay Key ID
    @GetMapping("/config")
    public ResponseEntity<?> getPaymentConfig() {
        return ResponseEntity.ok(Map.of(
                "keyId", razorpayKeyId
        ));
    }

    // Existing simulation / direct payment endpoint
    @PostMapping
    public ResponseEntity<?> processPayment(@RequestBody Map<String, Object> paymentRequest) {
        try {
            Long bookingId = ((Number) paymentRequest.get("bookingId")).longValue();
            Double amount = ((Number) paymentRequest.get("amount")).doubleValue();

            Payment payment = paymentRepository.findByBookingId(bookingId).orElse(new Payment());
            payment.setBookingId(bookingId);
            payment.setAmount(amount);
            payment.setPaymentStatus("SUCCESS");
            payment.setPaymentMethod("SIMULATED");
            payment.setTransactionId("TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
            payment.setPaymentDate(LocalDateTime.now());

            Payment savedPayment = paymentRepository.save(payment);
            return ResponseEntity.ok(savedPayment);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Payment processing failed: " + e.getMessage()));
        }
    }

    // 1. Create Razorpay Order
    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(@RequestBody Map<String, Object> request) {
        try {
            Long bookingId = ((Number) request.get("bookingId")).longValue();
            Double amount = ((Number) request.get("amount")).doubleValue();

            // Amount in paise (1 INR = 100 paise)
            long amountInPaise = Math.round(amount * 100);

            RazorpayClient razorpayClient = new RazorpayClient(razorpayKeyId, razorpayKeySecret);

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "bk_" + bookingId + "_" + (System.currentTimeMillis() % 100000));

            Order order = razorpayClient.orders.create(orderRequest);

            Map<String, Object> response = new HashMap<>();
            response.put("orderId", order.get("id"));
            response.put("amount", order.get("amount"));
            response.put("currency", order.get("currency"));
            response.put("keyId", razorpayKeyId);
            response.put("bookingId", bookingId);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to create Razorpay order: " + e.getMessage()));
        }
    }

    // 2. Verify Razorpay Payment Signature
    @PostMapping("/verify-payment")
    public ResponseEntity<?> verifyPayment(@RequestBody Map<String, Object> verifyRequest) {
        try {
            Long bookingId = ((Number) verifyRequest.get("bookingId")).longValue();
            Double amount = ((Number) verifyRequest.get("amount")).doubleValue();
            String razorpayOrderId = (String) verifyRequest.get("razorpayOrderId");
            String razorpayPaymentId = (String) verifyRequest.get("razorpayPaymentId");
            String razorpaySignature = (String) verifyRequest.get("razorpaySignature");

            if (razorpayOrderId == null || razorpayPaymentId == null || razorpaySignature == null) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Missing required Razorpay verification parameters."
                ));
            }

            // Verify signature using Razorpay Utils
            JSONObject attributes = new JSONObject();
            attributes.put("razorpay_order_id", razorpayOrderId);
            attributes.put("razorpay_payment_id", razorpayPaymentId);
            attributes.put("razorpay_signature", razorpaySignature);

            boolean isSignatureValid = Utils.verifyPaymentSignature(attributes, razorpayKeySecret);

            if (!isSignatureValid) {
                return ResponseEntity.badRequest().body(Map.of(
                        "success", false,
                        "message", "Payment verification failed: Invalid signature."
                ));
            }

            // Signature is authentic, record payment
            Payment payment = paymentRepository.findByBookingId(bookingId).orElse(new Payment());
            payment.setBookingId(bookingId);
            payment.setAmount(amount);
            payment.setPaymentStatus("SUCCESS");
            payment.setPaymentMethod("RAZORPAY");
            payment.setTransactionId(razorpayPaymentId);
            payment.setRazorpayOrderId(razorpayOrderId);
            payment.setPaymentDate(LocalDateTime.now());

            Payment savedPayment = paymentRepository.save(payment);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Payment verified and recorded successfully!",
                    "payment", savedPayment
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("success", false, "message", "Error verifying payment: " + e.getMessage()));
        }
    }

    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<?> getPaymentByBooking(@PathVariable Long bookingId) {
        return paymentRepository.findByBookingId(bookingId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
