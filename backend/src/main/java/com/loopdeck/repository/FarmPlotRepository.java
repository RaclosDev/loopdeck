package com.loopdeck.repository;

import com.loopdeck.model.FarmPlot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FarmPlotRepository extends JpaRepository<FarmPlot, Long> {
    List<FarmPlot> findByFarm_Id(Long farmId);
}
