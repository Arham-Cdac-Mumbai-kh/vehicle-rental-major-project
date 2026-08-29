package com.vehiclerental.booking_service.controller;

import com.vehiclerental.booking_service.client.PaymentClient;
import com.vehiclerental.booking_service.client.VehicleClient;
import com.vehiclerental.booking_service.dto.VehicleDTO;
import com.vehiclerental.booking_service.model.Booking;
import com.vehiclerental.booking_service.repository.BookingRepository;
import com.vehiclerental.booking_service.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private VehicleClient vehicleClient;

    @Autowired
    private PaymentClient paymentClient;

    @Autowired
    private JwtUtils jwtUtils;

    // Create a new booking (Renter only)
    @PostMapping
    @PreAuthorize("hasRole('RENTER')")
    public ResponseEntity<?> createBooking(
            @RequestHeader("Authorization") String tokenHeader,
            @RequestBody Booking bookingRequest) {
        
        try {
            String token = tokenHeader.substring(7);
            Long renterId = jwtUtils.getUserIdFromToken(token);
            
            // Fetch vehicle details via Feign Client
            VehicleDTO vehicle = vehicleClient.getVehicleById(bookingRequest.getVehicleId());
            if (vehicle == null || !"AVAILABLE".equals(vehicle.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Vehicle is not available for rent."));
            }

            // Prevent booking own vehicle
            if (vehicle.getOwnerId() != null && vehicle.getOwnerId().equals(renterId)) {
                return ResponseEntity.badRequest().body(Map.of("message", "You cannot book a vehicle that you own."));
            }

            if (bookingRequest.getStartDate().isAfter(bookingRequest.getEndDate())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Start date must be before end date."));
            }

            long totalDays = ChronoUnit.DAYS.between(bookingRequest.getStartDate(), bookingRequest.getEndDate());
            if (totalDays <= 0) {
                totalDays = 1; // Minimum 1 day rent
            }

            double totalAmount = totalDays * vehicle.getPricePerDay();

            Booking booking = new Booking();
            booking.setVehicleId(bookingRequest.getVehicleId());
            booking.setRenterId(renterId);
            booking.setStartDate(bookingRequest.getStartDate());
            booking.setEndDate(bookingRequest.getEndDate());
            booking.setTotalAmount(totalAmount);
            booking.setStatus("PENDING"); // Initial status before owner accepts
            booking.setOwnerPhone(vehicle.getOwnerPhone());

            Booking savedBooking = bookingRepository.save(booking);
            return ResponseEntity.ok(savedBooking);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Booking creation failed: " + e.getMessage()));
        }
    }

    // Accept booking (Owner only) - triggers simulated payment
    @PutMapping("/{id}/accept")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> acceptBooking(@PathVariable Long id) {
        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Booking booking = bookingOpt.get();
        if (!"PENDING".equals(booking.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Booking is not in PENDING state."));
        }

        booking.setStatus("CONFIRMED");
        bookingRepository.save(booking);

        // Process payment simulation via Feign client
        try {
            paymentClient.processPayment(Map.of(
                    "bookingId", booking.getId(),
                    "amount", booking.getTotalAmount()
            ));
        } catch (Exception e) {
            System.err.println("Simulated payment failed, but booking confirmed: " + e.getMessage());
        }

        return ResponseEntity.ok(Map.of("message", "Booking request accepted and confirmed!"));
    }

    // Reject booking (Owner only)
    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> rejectBooking(@PathVariable Long id) {
        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Booking booking = bookingOpt.get();
        if (!"PENDING".equals(booking.getStatus())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Booking is not in PENDING state."));
        }

        booking.setStatus("REJECTED");
        bookingRepository.save(booking);
        return ResponseEntity.ok(Map.of("message", "Booking request rejected."));
    }

    // Cancel booking (Renter or Owner)
    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelBooking(
            @RequestHeader("Authorization") String tokenHeader,
            @PathVariable Long id) {
        
        Optional<Booking> bookingOpt = bookingRepository.findById(id);
        if (bookingOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        Booking booking = bookingOpt.get();
        String token = tokenHeader.substring(7);
        Long userId = jwtUtils.getUserIdFromToken(token);
        List<String> roles = jwtUtils.getRolesFromToken(token);
        
        // Allowed if user is the renter, or vehicle owner (admin), or contains role ADMIN
        boolean isOwner = false;
        try {
            VehicleDTO vehicle = vehicleClient.getVehicleById(booking.getVehicleId());
            if (vehicle != null && vehicle.getOwnerId().equals(userId)) {
                isOwner = true;
            }
        } catch (Exception e) {
            // Ignore error
        }

        if (booking.getRenterId().equals(userId) || isOwner || roles.contains("ROLE_ADMIN")) {
            booking.setStatus("CANCELLED");
            bookingRepository.save(booking);
            return ResponseEntity.ok(Map.of("message", "Booking cancelled successfully."));
        }

        return ResponseEntity.status(403).body(Map.of("message", "Unauthorized to cancel this booking."));
    }

    // Renter's booking history
    @GetMapping("/renter/{renterId}")
    @PreAuthorize("hasRole('RENTER')")
    public ResponseEntity<?> getRenterBookings(@PathVariable Long renterId) {
        List<Booking> bookings = bookingRepository.findByRenterId(renterId);
        
        // Hydrate booking list with vehicle information
        List<Map<String, Object>> response = bookings.stream().map(booking -> {
            Map<String, Object> map = new HashMap<>();
            map.put("booking", booking);
            try {
                VehicleDTO vehicle = vehicleClient.getVehicleById(booking.getVehicleId());
                map.put("vehicle", vehicle);
            } catch (Exception e) {
                map.put("vehicle", null);
            }
            return map;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    // Owner's booking requests
    @GetMapping("/owner/{ownerId}")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> getOwnerBookings(@PathVariable Long ownerId) {
        try {
            // 1. Get vehicle IDs owned by owner
            List<VehicleDTO> vehicles = vehicleClient.getVehiclesByOwnerId(ownerId);
            if (vehicles.isEmpty()) {
                return ResponseEntity.ok(Collections.emptyList());
            }

            List<Long> vehicleIds = vehicles.stream().map(VehicleDTO::getId).collect(Collectors.toList());
            Map<Long, VehicleDTO> vehicleMap = vehicles.stream().collect(Collectors.toMap(VehicleDTO::getId, v -> v));

            // 2. Fetch bookings matching those vehicles
            List<Booking> bookings = bookingRepository.findByVehicleIdIn(vehicleIds);

            // 3. Hydrate with vehicle information
            List<Map<String, Object>> response = bookings.stream().map(booking -> {
                Map<String, Object> map = new HashMap<>();
                map.put("booking", booking);
                map.put("vehicle", vehicleMap.get(booking.getVehicleId()));
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Failed to load owner bookings: " + e.getMessage()));
        }
    }

    // Owner's earnings dashboard statistics
    @GetMapping("/owner/{ownerId}/earnings")
    @PreAuthorize("hasRole('OWNER')")
    public ResponseEntity<?> getOwnerEarnings(@PathVariable Long ownerId) {
        try {
            List<VehicleDTO> vehicles = vehicleClient.getVehiclesByOwnerId(ownerId);
            if (vehicles.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "totalEarnings", 0.0,
                        "monthlyEarnings", 0.0,
                        "platformFees", 0.0,
                        "ownerShare", 0.0,
                        "activeBookings", 0,
                        "listedVehicles", 0
                ));
            }

            List<Long> vehicleIds = vehicles.stream().map(VehicleDTO::getId).collect(Collectors.toList());
            List<Booking> bookings = bookingRepository.findByVehicleIdIn(vehicleIds);

            // Confirmed bookings represent earnings
            List<Booking> confirmedBookings = bookings.stream()
                    .filter(b -> "CONFIRMED".equals(b.getStatus()))
                    .collect(Collectors.toList());

            double totalEarnings = confirmedBookings.stream().mapToDouble(Booking::getTotalAmount).sum();
            
            // This month's earnings
            LocalDate startOfMonth = LocalDate.now().withDayOfMonth(1);
            double monthlyEarnings = confirmedBookings.stream()
                    .filter(b -> !b.getStartDate().isBefore(startOfMonth))
                    .mapToDouble(Booking::getTotalAmount).sum();

            double platformFees = totalEarnings * 0.10; // 10% commission
            double ownerShare = totalEarnings - platformFees;

            // Active bookings (Pending or Confirmed where endDate is not passed)
            long activeBookings = bookings.stream()
                    .filter(b -> ("PENDING".equals(b.getStatus()) || "CONFIRMED".equals(b.getStatus())) 
                            && !b.getEndDate().isBefore(LocalDate.now()))
                    .count();

            return ResponseEntity.ok(Map.of(
                    "totalEarnings", totalEarnings,
                    "monthlyEarnings", monthlyEarnings,
                    "platformFees", platformFees,
                    "ownerShare", ownerShare,
                    "activeBookings", activeBookings,
                    "listedVehicles", vehicles.size()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Failed to retrieve earnings: " + e.getMessage()));
        }
    }

    // Admin view all bookings
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllBookingsForAdmin() {
        List<Booking> bookings = bookingRepository.findAll();
        List<Map<String, Object>> response = bookings.stream().map(booking -> {
            Map<String, Object> map = new HashMap<>();
            map.put("booking", booking);
            try {
                VehicleDTO vehicle = vehicleClient.getVehicleById(booking.getVehicleId());
                map.put("vehicle", vehicle);
            } catch (Exception e) {
                map.put("vehicle", null);
            }
            return map;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }
}
