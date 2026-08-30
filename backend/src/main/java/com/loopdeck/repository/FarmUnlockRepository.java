package com.loopdeck.repository;

import com.loopdeck.model.FarmUnlock;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FarmUnlockRepository extends JpaRepository<FarmUnlock, Long> {
    List<FarmUnlock> findByFarm_Id(Long farmId);
}
