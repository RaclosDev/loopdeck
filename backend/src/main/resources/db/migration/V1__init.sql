-- ═══════════════════════════════════════════════════════════
-- LoopDeck — V1 Initial Schema
-- ═══════════════════════════════════════════════════════════

-- ── Users ─────────────────────────────────────────────────
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Deck Presets ──────────────────────────────────────────
CREATE TABLE deck_presets (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Default',
    new_cards_per_day INT DEFAULT 20,
    max_reviews_per_day INT DEFAULT 200,
    learning_steps VARCHAR(100) DEFAULT '1,10',
    graduating_interval INT DEFAULT 1,
    easy_interval INT DEFAULT 4,
    starting_ease DOUBLE PRECISION DEFAULT 2.5,
    easy_bonus DOUBLE PRECISION DEFAULT 1.3,
    interval_modifier DOUBLE PRECISION DEFAULT 1.0,
    max_interval INT DEFAULT 36500,
    relearning_steps VARCHAR(100) DEFAULT '10',
    min_interval INT DEFAULT 1,
    leech_threshold INT DEFAULT 8,
    leech_action VARCHAR(20) DEFAULT 'suspend',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Decks ─────────────────────────────────────────────────
CREATE TABLE decks (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_id VARCHAR(36) REFERENCES decks(id) ON DELETE SET NULL,
    preset_id VARCHAR(36) REFERENCES deck_presets(id) ON DELETE SET NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Notes ─────────────────────────────────────────────────
CREATE TABLE notes (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    deck_id VARCHAR(36) NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    note_type VARCHAR(50) NOT NULL DEFAULT 'basic',
    fields_json TEXT NOT NULL DEFAULT '{}',
    tags VARCHAR(1000) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Cards ─────────────────────────────────────────────────
CREATE TABLE cards (
    id VARCHAR(36) PRIMARY KEY,
    note_id VARCHAR(36) NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    card_ordinal INT DEFAULT 0,
    state VARCHAR(20) DEFAULT 'new',
    due TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    interval_days DOUBLE PRECISION DEFAULT 0,
    ease_factor DOUBLE PRECISION DEFAULT 2.5,
    repetitions INT DEFAULT 0,
    lapses INT DEFAULT 0,
    learning_step INT DEFAULT 0,
    suspended BOOLEAN DEFAULT FALSE,
    buried BOOLEAN DEFAULT FALSE,
    flag_color VARCHAR(10),
    is_leech BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Reviews ───────────────────────────────────────────────
CREATE TABLE reviews (
    id VARCHAR(36) PRIMARY KEY,
    card_id VARCHAR(36) NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    rating INT NOT NULL,
    interval_days DOUBLE PRECISION,
    ease_factor DOUBLE PRECISION,
    time_taken_ms INT,
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Indexes ───────────────────────────────────────────────
CREATE INDEX idx_decks_user ON decks(user_id);
CREATE INDEX idx_notes_deck ON notes(deck_id);
CREATE INDEX idx_notes_user ON notes(user_id);
CREATE INDEX idx_cards_note ON cards(note_id);
CREATE INDEX idx_cards_state ON cards(state);
CREATE INDEX idx_cards_due ON cards(due);
CREATE INDEX idx_reviews_card ON reviews(card_id);
CREATE INDEX idx_reviews_date ON reviews(reviewed_at);
