-- Add column
ALTER TABLE cards ADD COLUMN deck_id VARCHAR(36);

-- Populate it
UPDATE cards SET deck_id = notes.deck_id FROM notes WHERE cards.note_id = notes.id;

-- Make it NOT NULL
ALTER TABLE cards ALTER COLUMN deck_id SET NOT NULL;

-- Create composite index for study queries
CREATE INDEX idx_cards_study ON cards(deck_id, due) WHERE suspended = false AND buried = false;
