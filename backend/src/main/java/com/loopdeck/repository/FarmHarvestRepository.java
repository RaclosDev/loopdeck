package com.loopdeck.repository;

import com.loopdeck.model.FarmHarvest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FarmHarvestRepository extends JpaRepository<FarmHarvest, Long> {
    List<FarmHarvest> findByFarmId(Long farmId);
    Optional<FarmHarvest> findByFarmIdAndCropId(Long farmId, String cropId);
}
