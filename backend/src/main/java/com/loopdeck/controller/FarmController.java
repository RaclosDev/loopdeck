package com.loopdeck.controller;

import com.loopdeck.service.FarmService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/farm")
@RequiredArgsConstructor
public class FarmController {

    private final FarmService farmService;

    @GetMapping
    public ResponseEntity<?> getFarm(Authentication auth) {
        try {
            return ResponseEntity.ok(farmService.getFarmView(auth.getName()));
        } catch (Exception e) {
            java.io.StringWriter sw = new java.io.StringWriter();
            e.printStackTrace(new java.io.PrintWriter(sw));
            return ResponseEntity.status(500).body(java.util.Map.of(
                "error", e.getMessage(),
                "stack", sw.toString()
            ));
        }
    }

    public record PlantSeedRequest(int plotIndex, String cropId) {}

    @PostMapping("/plant")
    public ResponseEntity<?> plantSeed(Authentication auth, @RequestBody PlantSeedRequest req) {
        farmService.plantSeed(auth.getName(), req.plotIndex(), req.cropId());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/available-crops")
    public ResponseEntity<?> getAvailableCrops(Authentication auth) {
        return ResponseEntity.ok(farmService.getAvailableCrops(auth.getName()));
    }
}
