package com.loopdeck.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "farm_inventory")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FarmInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "farm_id", nullable = false)
    private Long farmId;

    @Column(name = "item_id", nullable = false)
    private String itemId;

    @Column(name = "quantity", nullable = false)
    private Integer quantity = 0;
}
