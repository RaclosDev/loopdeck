package com.loopdeck.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "deck_documents")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DeckDocument {

    @Id
    @Column(name = "deck_id")
    private String deckId;

    @Column(name = "file_data", nullable = false)
    private byte[] fileData;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "content_type")
    private String contentType;
}
