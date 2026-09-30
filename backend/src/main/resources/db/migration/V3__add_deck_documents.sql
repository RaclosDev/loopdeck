CREATE TABLE IF NOT EXISTS deck_documents (
    deck_id VARCHAR(255) PRIMARY KEY,
    file_data BYTEA NOT NULL,
    file_name VARCHAR(255),
    content_type VARCHAR(255),
    CONSTRAINT fk_deck_doc FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
);
