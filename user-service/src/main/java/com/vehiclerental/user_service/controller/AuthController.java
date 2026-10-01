package com.vehiclerental.user_service.controller;

import com.vehiclerental.user_service.model.Role;
import com.vehiclerental.user_service.model.User;
import com.vehiclerental.user_service.model.OtpVerification;
import com.vehiclerental.user_service.repository.RoleRepository;
import com.vehiclerental.user_service.repository.UserRepository;
import com.vehiclerental.user_service.repository.OtpVerificationRepository;
import com.vehiclerental.user_service.service.EmailService;
import com.vehiclerental.user_service.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private OtpVerificationRepository otpVerificationRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    @PostMapping("/api/auth/register")
    public ResponseEntity<?> registerUser(@RequestBody User userRequest) {
        Optional<User> existingUserOpt = userRepository.findByEmail(userRequest.getEmail());
        
        if (existingUserOpt.isPresent() && existingUserOpt.get().isVerified()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Error: Email is already in use!"));
        }

        User user = existingUserOpt.orElse(new User());
        user.setName(userRequest.getName());
        user.setEmail(userRequest.getEmail());
        user.setPassword(passwordEncoder.encode(userRequest.getPassword()));
        user.setPhone(userRequest.getPhone());
        user.setVerified(false); // Force verification required

        // Default role is RENTER
        if (user.getRoles() == null || user.getRoles().isEmpty()) {
            Set<Role> roles = new HashSet<>();
            Role renterRole = roleRepository.findByName("ROLE_RENTER")
                    .orElseThrow(() -> new RuntimeException("Error: Renter Role not found."));
            roles.add(renterRole);
            user.setRoles(roles);
        }

        userRepository.save(user);

        // Generate 6-digit OTP
        String otp = String.format("%06d", new Random().nextInt(1000000));
        
        // Save or update OTP record
        OtpVerification verification = new OtpVerification(
                user.getEmail(),
                otp,
                LocalDateTime.now().plusMinutes(5)
        );
        otpVerificationRepository.save(verification);

        // Send OTP via Email Service
        emailService.sendOtp(user.getEmail(), otp);

        return ResponseEntity.ok(Map.of(
                "message", "Verification code sent to email.",
                "email", user.getEmail()
        ));
    }

    @PostMapping("/api/auth/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");

        Optional<OtpVerification> otpOpt = otpVerificationRepository.findByEmailAndOtp(email, otp);
        if (otpOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid verification code."));
        }

        OtpVerification verification = otpOpt.get();
        if (verification.getExpiryTime().isBefore(LocalDateTime.now())) {
            otpVerificationRepository.delete(verification);
            return ResponseEntity.badRequest().body(Map.of("message", "Verification code has expired. Please register again."));
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        user.setVerified(true);
        userRepository.save(user);

        // Clean up OTP verification
        otpVerificationRepository.delete(verification);

        return ResponseEntity.ok(Map.of("message", "Email verified successfully! You can now log in."));
    }

    @PostMapping("/api/auth/login")
    public ResponseEntity<?> authenticateUser(@RequestBody Map<String, String> loginRequest) {
        String email = loginRequest.get("email");
        String password = loginRequest.get("password");

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty() || !passwordEncoder.matches(password, userOpt.get().getPassword())) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid email or password"));
        }

        User user = userOpt.get();
        if (!user.isVerified()) {
            return ResponseEntity.status(401).body(Map.of("message", "Please verify your email address before logging in."));
        }

        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toList());

        String jwt = jwtUtils.generateToken(user.getEmail(), user.getId(), roles);

        return ResponseEntity.ok(Map.of(
                "token", jwt,
                "userId", user.getId(),
                "name", user.getName(),
                "email", user.getEmail(),
                "roles", roles
        ));
    }

    @GetMapping("/api/users/me")
    public ResponseEntity<?> getCurrentUser() {
        String email = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "name", user.getName(),
                "email", user.getEmail(),
                "phone", user.getPhone() != null ? user.getPhone() : "",
                "roles", roles
        ));
    }

    // Add role capability to a user (e.g., enable OWNER role)
    @PostMapping("/api/users/{id}/roles")
    public ResponseEntity<?> addRoleToUser(@PathVariable Long id, @RequestBody Map<String, String> roleRequest) {
        String roleName = roleRequest.get("roleName"); // e.g. ROLE_OWNER
        
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Role newRole = roleRepository.findByName(roleName)
                .orElseThrow(() -> new RuntimeException("Role not found: " + roleName));

        user.getRoles().add(newRole);
        userRepository.save(user);

        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toList());

        // Return a fresh token with updated roles
        String jwt = jwtUtils.generateToken(user.getEmail(), user.getId(), roles);

        return ResponseEntity.ok(Map.of(
                "message", "Role " + roleName + " added successfully!",
                "token", jwt,
                "roles", roles
        ));
    }

    // Admin endpoint to get all users
    @GetMapping("/api/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllUsers() {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> response = users.stream().map(user -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", user.getId());
            map.put("name", user.getName());
            map.put("email", user.getEmail());
            map.put("phone", user.getPhone());
            map.put("roles", user.getRoles().stream().map(Role::getName).collect(Collectors.toList()));
            return map;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(response);
    }
}
