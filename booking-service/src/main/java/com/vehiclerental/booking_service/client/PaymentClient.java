package com.vehiclerental.booking_service.client;

import com.vehiclerental.booking_service.config.FeignClientConfig;
import com.vehiclerental.booking_service.dto.PaymentDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;

@FeignClient(name = "payment-service", configuration = FeignClientConfig.class)
public interface PaymentClient {

    @PostMapping("/api/payments")
    PaymentDTO processPayment(@RequestBody Map<String, Object> paymentRequest);

    @GetMapping("/api/payments/booking/{bookingId}")
    PaymentDTO getPaymentByBookingId(@PathVariable("bookingId") Long bookingId);
}
