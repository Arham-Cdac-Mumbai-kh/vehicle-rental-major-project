package com.vehiclerental.vehicle_service;

import com.vehiclerental.vehicle_service.model.Vehicle;
import com.vehiclerental.vehicle_service.repository.VehicleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class VehicleServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(VehicleServiceApplication.class, args);
    }

    @Bean
    CommandLineRunner initVehicles(VehicleRepository repository) {
        return args -> {
            if (repository.count() == 0) {
                // Pre-populate some vehicles
                Vehicle v1 = new Vehicle();
                v1.setOwnerId(1L); // Admin or first user
                v1.setBrand("Hyundai");
                v1.setModel("Creta");
                v1.setYear(2024);
                v1.setType("SUV");
                v1.setRegistrationNumber("MH12XX9999");
                v1.setLocation("Mumbai");
                v1.setPricePerDay(2500.0);
                v1.setStatus("AVAILABLE");
                v1.setOwnerPhone("+91 9876543210");
                repository.save(v1);

                Vehicle v2 = new Vehicle();
                v2.setOwnerId(1L);
                v2.setBrand("Mahindra");
                v2.setModel("Thar");
                v2.setYear(2023);
                v2.setType("SUV");
                v2.setRegistrationNumber("DL03YY8888");
                v2.setLocation("Delhi");
                v2.setPricePerDay(3000.0);
                v2.setStatus("AVAILABLE");
                v2.setOwnerPhone("+91 9876543210");
                repository.save(v2);

                Vehicle v3 = new Vehicle();
                v3.setOwnerId(1L);
                v3.setBrand("Honda");
                v3.setModel("Civic");
                v3.setYear(2022);
                v3.setType("Sedan");
                v3.setRegistrationNumber("KA51ZZ7777");
                v3.setLocation("Mumbai");
                v3.setPricePerDay(2000.0);
                v3.setStatus("PENDING_APPROVAL");
                v3.setOwnerPhone("+91 9876543210");
                repository.save(v3);

                System.out.println("Vehicles pre-populated successfully!");
            }
        };
    }
}
