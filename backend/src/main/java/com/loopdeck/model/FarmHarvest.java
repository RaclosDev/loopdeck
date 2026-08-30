package com.loopdeck.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "farm_harvests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FarmHarvest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "farm_id", nullable = false)
    private Long farmId;

    @Column(name = "crop_id", nullable = false)
    private String cropId;

    @Column(name = "quantity", nullable = false)
    private Integer quantity = 0;

    @Column(name = "sell_value", nullable = false)
    private Integer sellValue = 0;
}
