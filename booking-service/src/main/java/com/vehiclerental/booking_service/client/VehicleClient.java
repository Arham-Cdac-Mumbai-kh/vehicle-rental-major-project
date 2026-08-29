package com.vehiclerental.booking_service.client;

import com.vehiclerental.booking_service.config.FeignClientConfig;
import com.vehiclerental.booking_service.dto.VehicleDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.List;

@FeignClient(name = "vehicle-service", configuration = FeignClientConfig.class)
public interface VehicleClient {

    @GetMapping("/api/vehicles/{id}")
    VehicleDTO getVehicleById(@PathVariable("id") Long id);

    @GetMapping("/api/vehicles/owner/{ownerId}")
    List<VehicleDTO> getVehiclesByOwnerId(@PathVariable("ownerId") Long ownerId);
}
