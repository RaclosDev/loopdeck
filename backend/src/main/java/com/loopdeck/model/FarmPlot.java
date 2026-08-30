package com.loopdeck.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "farm_plots")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FarmPlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "farm_id", nullable = false)
    private Long farmId;

    @Column(name = "plot_index", nullable = false)
    private Integer plotIndex;

    @Column(name = "crop_id")
    private String cropId;

    @Column(name = "planted_at")
    private Instant plantedAt;

    @Column(name = "ready_at")
    private Instant readyAt;

    @Column(name = "status", nullable = false)
    private String status = "empty";

    @Column(name = "has_fertilizer", nullable = false)
    private Boolean hasFertilizer = false;

    @Column(name = "has_golden_compost", nullable = false)
    private Boolean hasGoldenCompost = false;

    @Column(name = "is_protected", nullable = false)
    private Boolean isProtected = false;
}
