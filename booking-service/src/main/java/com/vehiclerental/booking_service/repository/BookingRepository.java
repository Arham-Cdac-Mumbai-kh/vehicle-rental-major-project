package com.vehiclerental.booking_service.repository;

import com.vehiclerental.booking_service.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByRenterId(Long renterId);
    List<Booking> findByVehicleIdIn(List<Long> vehicleIds);
    List<Booking> findByVehicleId(Long vehicleId);
}
