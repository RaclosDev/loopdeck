package com.loopdeck.model;

import jakarta.persistence.*;
@Entity
@Table(name = "deck_documents")
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
    public DeckDocument() {}

    public DeckDocument(String deckId, byte[] fileData, String fileName, String contentType) {
        this.deckId = deckId;
        this.fileData = fileData;
        this.fileName = fileName;
        this.contentType = contentType;
    }

    public String getDeckId() { return deckId; }

    public void setDeckId(String deckId) { this.deckId = deckId; }

    public byte[] getFileData() { return fileData; }

    public void setFileData(byte[] fileData) { this.fileData = fileData; }

    public String getFileName() { return fileName; }

    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getContentType() { return contentType; }

    public void setContentType(String contentType) { this.contentType = contentType; }

    public static DeckDocumentBuilder builder() { return new DeckDocumentBuilder(); }

    public static class DeckDocumentBuilder {
        private String deckId;
        private byte[] fileData;
        private String fileName;
        private String contentType;
        public DeckDocumentBuilder deckId(String deckId) { this.deckId = deckId; return this; }
        public DeckDocumentBuilder fileData(byte[] fileData) { this.fileData = fileData; return this; }
        public DeckDocumentBuilder fileName(String fileName) { this.fileName = fileName; return this; }
        public DeckDocumentBuilder contentType(String contentType) { this.contentType = contentType; return this; }
        public DeckDocument build() { return new DeckDocument(this.deckId, this.fileData, this.fileName, this.contentType); }
    }
}
