CREATE INDEX idx_cards_deck ON cards(deck_id);
CREATE INDEX idx_notes_deck_page ON notes(deck_id, created_at DESC, id DESC);
