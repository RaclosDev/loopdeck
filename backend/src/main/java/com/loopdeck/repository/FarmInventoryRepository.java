package com.loopdeck.repository;

import com.loopdeck.model.FarmInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FarmInventoryRepository extends JpaRepository<FarmInventory, Long> {
    List<FarmInventory> findByFarmId(Long farmId);
    Optional<FarmInventory> findByFarmIdAndItemId(Long farmId, String itemId);
}
