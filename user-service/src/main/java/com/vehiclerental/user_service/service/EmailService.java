package com.vehiclerental.user_service.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    public void sendOtp(String toEmail, String otp) {
        System.out.println("\n========================================================");
        System.out.println("📬 OTP SENDING IN PROGRESS FOR: " + toEmail);
        System.out.println("🔑 GENERATED ONE-TIME PASSWORD (OTP): [ " + otp + " ]");
        System.out.println("========================================================\n");

        if (mailSender == null) {
            System.out.println("⚠️ SMTP JavaMailSender is not configured in application.properties. Simulated sending via console only.");
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("no-reply@drivep2p.com");
            message.setTo(toEmail);
            message.setSubject("DriveP2P Account Verification Code");
            message.setText("Welcome to DriveP2P!\n\n" +
                    "Your email verification code is: " + otp + "\n\n" +
                    "This code will expire in 5 minutes.\n\n" +
                    "Happy Renting!\n" +
                    "The DriveP2P Team");

            mailSender.send(message);
            System.out.println("✅ Verification email sent successfully to " + toEmail);
        } catch (Exception e) {
            System.out.println("❌ Failed to send SMTP email (using simulated console output fallback): " + e.getMessage());
        }
    }
}
