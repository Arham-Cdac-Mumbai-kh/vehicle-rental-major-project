package com.vehiclerental.user_service;

import com.vehiclerental.user_service.model.Role;
import com.vehiclerental.user_service.model.User;
import com.vehiclerental.user_service.repository.RoleRepository;
import com.vehiclerental.user_service.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.HashSet;
import java.util.Set;

@SpringBootApplication
public class UserServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(UserServiceApplication.class, args);
    }

    @Bean
    CommandLineRunner run(RoleRepository roleRepository, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            // Initialize roles
            Role renterRole = roleRepository.findByName("ROLE_RENTER")
                    .orElseGet(() -> roleRepository.save(new Role("ROLE_RENTER")));
            Role ownerRole = roleRepository.findByName("ROLE_OWNER")
                    .orElseGet(() -> roleRepository.save(new Role("ROLE_OWNER")));
            Role adminRole = roleRepository.findByName("ROLE_ADMIN")
                    .orElseGet(() -> roleRepository.save(new Role("ROLE_ADMIN")));

            // Create admin user if not exists
            if (userRepository.findByEmail("admin@rentals.com").isEmpty()) {
                User admin = new User();
                admin.setName("System Admin");
                admin.setEmail("admin@rentals.com");
                admin.setPassword(passwordEncoder.encode("admin123"));
                admin.setPhone("1234567890");
                admin.setVerified(true);
                
                Set<Role> roles = new HashSet<>();
                roles.add(adminRole);
                roles.add(renterRole); // Admins can also rent
                admin.setRoles(roles);
                
                userRepository.save(admin);
                System.out.println("Admin user initialized: admin@rentals.com / admin123");
            }
        };
    }
}
