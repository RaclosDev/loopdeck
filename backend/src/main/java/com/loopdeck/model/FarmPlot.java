package com.loopdeck.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "farm_plots", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"farm_id", "plot_index"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class FarmPlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farm_id", nullable = false)
    private UserFarm farm;

    @Column(name = "plot_index", nullable = false)
    private Integer plotIndex;

    @Column(name = "crop_id")
    private String cropId;

    @Column(name = "planted_at")
    private Instant plantedAt;

    @Column(name = "matures_at")
    private Instant maturesAt;

    @Builder.Default
    @Column(nullable = false)
    private String status = "empty";

    @Column(name = "last_harvest_at")
    private Instant lastHarvestAt;

    @Builder.Default
    @Column(name = "total_harvested", nullable = false)
    private Integer totalHarvested = 0;
}
