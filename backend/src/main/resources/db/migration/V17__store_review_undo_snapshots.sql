ALTER TABLE reviews ADD COLUMN previous_state JSONB;
ALTER TABLE reviews ADD COLUMN undone BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX idx_reviews_latest_active ON reviews(card_id, reviewed_at DESC, id DESC) WHERE undone = FALSE;
