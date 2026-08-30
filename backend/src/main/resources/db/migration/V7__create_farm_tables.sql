-- ============================================================
-- V7: Create farm tables for the gamification system
-- ============================================================

-- Main farm entity (one per user)
CREATE TABLE user_farms (
    id          BIGSERIAL PRIMARY KEY,
    user_id     VARCHAR(255) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    farm_level  INTEGER NOT NULL DEFAULT 1,
    farm_xp     INTEGER NOT NULL DEFAULT 0,
    total_plots_unlocked INTEGER NOT NULL DEFAULT 2,
    owned_tools TEXT DEFAULT '',
    owned_decorations TEXT DEFAULT '',
    last_visit  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual farm plots
CREATE TABLE farm_plots (
    id          BIGSERIAL PRIMARY KEY,
    farm_id     BIGINT NOT NULL REFERENCES user_farms(id) ON DELETE CASCADE,
    plot_index  INTEGER NOT NULL,
    crop_id     VARCHAR(50),
    planted_at  TIMESTAMP WITH TIME ZONE,
    ready_at    TIMESTAMP WITH TIME ZONE,
    status      VARCHAR(20) NOT NULL DEFAULT 'empty',
    has_fertilizer BOOLEAN NOT NULL DEFAULT FALSE,
    has_golden_compost BOOLEAN NOT NULL DEFAULT FALSE,
    is_protected BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(farm_id, plot_index)
);

-- Farm inventory (consumable items)
CREATE TABLE farm_inventory (
    id          BIGSERIAL PRIMARY KEY,
    farm_id     BIGINT NOT NULL REFERENCES user_farms(id) ON DELETE CASCADE,
    item_id     VARCHAR(50) NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 0,
    UNIQUE(farm_id, item_id)
);

-- Harvested crops storage (silo)
CREATE TABLE farm_harvests (
    id          BIGSERIAL PRIMARY KEY,
    farm_id     BIGINT NOT NULL REFERENCES user_farms(id) ON DELETE CASCADE,
    crop_id     VARCHAR(50) NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 0,
    sell_value  INTEGER NOT NULL DEFAULT 0,
    UNIQUE(farm_id, crop_id)
);

-- Create a farm for every existing user with 2 starter plots
INSERT INTO user_farms (user_id, farm_level, farm_xp, total_plots_unlocked, last_visit)
SELECT id, 1, 0, 2, NOW() FROM users;

-- Create the 2 starter plots for each farm
INSERT INTO farm_plots (farm_id, plot_index, status)
SELECT uf.id, 0, 'empty' FROM user_farms uf;

INSERT INTO farm_plots (farm_id, plot_index, status)
SELECT uf.id, 1, 'empty' FROM user_farms uf;
