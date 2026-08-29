package com.vehiclerental.vehicle_service.controller;

import com.vehiclerental.vehicle_service.model.Vehicle;
import com.vehiclerental.vehicle_service.repository.VehicleRepository;
import com.vehiclerental.vehicle_service.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @GetMapping
    public ResponseEntity<List<Vehicle>> searchVehicles(
            @RequestParam(required = false) String location,
            @RequestParam(required = false) String type) {

        List<Vehicle> vehicles;
        if (location != null && !location.trim().isEmpty() && type != null && !type.trim().isEmpty()) {
            vehicles = vehicleRepository.findByLocationIgnoreCaseAndTypeIgnoreCaseAndStatus(location, type,
                    "AVAILABLE");
        } else if (location != null && !location.trim().isEmpty()) {
            vehicles = vehicleRepository.findByLocationIgnoreCaseAndStatus(location, "AVAILABLE");
        } else if (type != null && !type.trim().isEmpty()) {
            vehicles = vehicleRepository.findByTypeIgnoreCaseAndStatus(type, "AVAILABLE");
        } else {
            vehicles = vehicleRepository.findByStatus("AVAILABLE");
        }
        return ResponseEntity.ok(vehicles);
    }

    // Get vehicle by ID
    @GetMapping("/{id}")
    public ResponseEntity<?> getVehicleById(@PathVariable Long id) {
        Optional<Vehicle> vehicleOpt = vehicleRepository.findById(id);
        if (vehicleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(vehicleOpt.get());
    }

    // List a new vehicle (Owner only)
    @PostMapping
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> listVehicle(
            @RequestHeader("Authorization") String tokenHeader,
            @RequestBody Vehicle vehicle) {

        try {
            String token = tokenHeader.substring(7);
            Long ownerId = jwtUtils.getUserIdFromToken(token);

            vehicle.setOwnerId(ownerId);
            vehicle.setStatus("PENDING_APPROVAL"); // Must be approved by admin

            Vehicle savedVehicle = vehicleRepository.save(vehicle);
            return ResponseEntity.ok(savedVehicle);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Error listing vehicle: " + e.getMessage()));
        }
    }

    // View owner's vehicles (Owner only)
    @GetMapping("/owner/{ownerId}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<List<Vehicle>> getOwnerVehicles(@PathVariable Long ownerId) {
        List<Vehicle> vehicles = vehicleRepository.findByOwnerId(ownerId);
        return ResponseEntity.ok(vehicles);
    }

    // Admin view all vehicles
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Vehicle>> getAllVehiclesForAdmin() {
        return ResponseEntity.ok(vehicleRepository.findAll());
    }

    // Approve vehicle listing (Admin only)
    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approveVehicle(@PathVariable Long id) {
        Optional<Vehicle> vehicleOpt = vehicleRepository.findById(id);
        if (vehicleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Vehicle vehicle = vehicleOpt.get();
        vehicle.setStatus("AVAILABLE");
        vehicleRepository.save(vehicle);
        return ResponseEntity.ok(Map.of("message", "Vehicle listing approved and is now available for rent!"));
    }

    // Reject vehicle listing (Admin only)
    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> rejectVehicle(@PathVariable Long id) {
        Optional<Vehicle> vehicleOpt = vehicleRepository.findById(id);
        if (vehicleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Vehicle vehicle = vehicleOpt.get();
        vehicle.setStatus("REJECTED");
        vehicleRepository.save(vehicle);
        return ResponseEntity.ok(Map.of("message", "Vehicle listing rejected."));
    }

    // Remove vehicle listing (Admin or Owner)
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteVehicle(
            @RequestHeader("Authorization") String tokenHeader,
            @PathVariable Long id) {

        Optional<Vehicle> vehicleOpt = vehicleRepository.findById(id);
        if (vehicleOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Vehicle vehicle = vehicleOpt.get();
        String token = tokenHeader.substring(7);
        Long userId = jwtUtils.getUserIdFromToken(token);
        List<String> roles = jwtUtils.getRolesFromToken(token);

        // Only owner of the vehicle or ADMIN can delete
        if (vehicle.getOwnerId().equals(userId) || roles.contains("ROLE_ADMIN")) {
            vehicleRepository.delete(vehicle);
            return ResponseEntity.ok(Map.of("message", "Vehicle deleted successfully."));
        }

        return ResponseEntity.status(403).body(Map.of("message", "Unauthorized to delete this vehicle."));
    }
}
