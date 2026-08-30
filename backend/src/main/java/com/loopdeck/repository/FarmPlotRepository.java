package com.loopdeck.repository;

import com.loopdeck.model.FarmPlot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface FarmPlotRepository extends JpaRepository<FarmPlot, Long> {
    List<FarmPlot> findByFarmIdOrderByPlotIndex(Long farmId);
    Optional<FarmPlot> findByFarmIdAndPlotIndex(Long farmId, Integer plotIndex);
}
