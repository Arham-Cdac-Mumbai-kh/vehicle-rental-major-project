package com.vehiclerental.vehicle_service.repository;

import com.vehiclerental.vehicle_service.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    List<Vehicle> findByStatus(String status);
    List<Vehicle> findByOwnerId(Long ownerId);
    List<Vehicle> findByLocationIgnoreCaseAndTypeIgnoreCaseAndStatus(String location, String type, String status);
    List<Vehicle> findByLocationIgnoreCaseAndStatus(String location, String status);
    List<Vehicle> findByTypeIgnoreCaseAndStatus(String type, String status);
    List<Vehicle> findAllByStatus(String status);
}
