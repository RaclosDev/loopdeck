package com.loopdeck.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "user_farms")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserFarm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", unique = true, nullable = false)
    private String userId;

    @Column(name = "farm_level", nullable = false)
    private Integer farmLevel = 1;

    @Column(name = "farm_xp", nullable = false)
    private Integer farmXp = 0;

    @Column(name = "total_plots_unlocked", nullable = false)
    private Integer totalPlotsUnlocked = 2;

    @Column(name = "owned_tools", columnDefinition = "text")
    private String ownedTools = "";

    @Column(name = "owned_decorations", columnDefinition = "text")
    private String ownedDecorations = "";

    @Column(name = "last_visit")
    private Instant lastVisit;
}
