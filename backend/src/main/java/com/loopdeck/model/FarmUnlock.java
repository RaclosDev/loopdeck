package com.loopdeck.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "farm_unlocks", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"farm_id", "unlock_id"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FarmUnlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farm_id", nullable = false)
    private UserFarm farm;

    @Column(name = "unlock_id", nullable = false)
    private String unlockId;

    @Builder.Default
    @Column(name = "unlocked_at", nullable = false)
    private Instant unlockedAt = Instant.now();
}
