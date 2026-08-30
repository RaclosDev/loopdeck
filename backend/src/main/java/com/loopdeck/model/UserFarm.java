package com.loopdeck.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "user_farms")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserFarm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", unique = true, nullable = false)
    private String userId;

    @Builder.Default
    @Column(name = "light_points", nullable = false)
    private Integer lightPoints = 0;

    @Builder.Default
    @Column(name = "pending_seeds", nullable = false)
    private Integer pendingSeeds = 1;

    @Builder.Default
    @Column(name = "total_plots_unlocked", nullable = false)
    private Integer totalPlotsUnlocked = 3;

    @Builder.Default
    @Column(name = "last_visit", nullable = false)
    private Instant lastVisit = Instant.now();

    @Builder.Default
    @OneToMany(mappedBy = "farm", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FarmPlot> plots = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "farm", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<FarmUnlock> unlocks = new ArrayList<>();
}
