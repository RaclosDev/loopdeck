CREATE TABLE user_forests (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    light_points INTEGER NOT NULL DEFAULT 0,
    pending_seeds INTEGER NOT NULL DEFAULT 1,
    last_visit TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_cards_reviewed INTEGER NOT NULL DEFAULT 0,
    mastered_decks INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE forest_plants (
    id BIGSERIAL PRIMARY KEY,
    forest_id BIGINT NOT NULL REFERENCES user_forests(id) ON DELETE CASCADE,
    species_id VARCHAR(50) NOT NULL,
    planted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    matures_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'growing',
    is_permanent BOOLEAN NOT NULL,
    last_harvest_at TIMESTAMPTZ,
    total_harvested INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE forest_unlocks (
    id BIGSERIAL PRIMARY KEY,
    forest_id BIGINT NOT NULL REFERENCES user_forests(id) ON DELETE CASCADE,
    unlock_id VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
