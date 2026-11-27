package com.loopdeck.repository;

import com.loopdeck.model.Passkey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PasskeyRepository extends JpaRepository<Passkey, Long> {

    List<Passkey> findByUserIdOrderByCreatedAtAsc(String userId);

    long countByUserId(String userId);

    Optional<Passkey> findByCredentialId(byte[] credentialId);

    Optional<Passkey> findFirstByUserId(String userId);

    Optional<Passkey> findFirstByUserHandle(byte[] userHandle);

    Optional<Passkey> findByIdAndUserId(Long id, String userId);

    @Modifying
    @Query("DELETE FROM Passkey p WHERE p.userId = :userId")
    int deleteByUserId(@Param("userId") String userId);

    @Query("SELECT p.credentialId FROM Passkey p WHERE p.userId = :userId")
    List<byte[]> findCredentialIdsByUserId(@Param("userId") String userId);
}
