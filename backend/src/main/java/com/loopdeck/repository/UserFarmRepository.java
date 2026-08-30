package com.loopdeck.repository;

import com.loopdeck.model.UserFarm;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserFarmRepository extends JpaRepository<UserFarm, Long> {
    Optional<UserFarm> findByUserId(String userId);
}
