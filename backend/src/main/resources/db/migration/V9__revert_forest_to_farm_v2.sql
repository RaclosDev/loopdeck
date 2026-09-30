-- Drop all forest tables and sequences
DROP TABLE IF EXISTS forest_plants CASCADE;
DROP TABLE IF EXISTS forest_unlocks CASCADE;
DROP TABLE IF EXISTS user_forests CASCADE;

-- Drop existing farm tables if any (from V7)
DROP TABLE IF EXISTS farm_plots CASCADE;
DROP TABLE IF EXISTS farm_unlocks CASCADE;
DROP TABLE IF EXISTS user_farms CASCADE;

-- Create user_farms table
CREATE TABLE user_farms (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    light_points INTEGER NOT NULL DEFAULT 0,
    pending_seeds INTEGER NOT NULL DEFAULT 1,
    total_plots_unlocked INTEGER NOT NULL DEFAULT 3,
    last_visit TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create farm_plots table
CREATE TABLE farm_plots (
    id BIGSERIAL PRIMARY KEY,
    farm_id BIGINT NOT NULL REFERENCES user_farms(id) ON DELETE CASCADE,
    plot_index INTEGER NOT NULL,
    crop_id VARCHAR(50),
    planted_at TIMESTAMP WITH TIME ZONE,
    matures_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'empty',
    last_harvest_at TIMESTAMP WITH TIME ZONE,
    total_harvested INTEGER NOT NULL DEFAULT 0,
    UNIQUE(farm_id, plot_index)
);

-- Create farm_unlocks table
CREATE TABLE farm_unlocks (
    id BIGSERIAL PRIMARY KEY,
    farm_id BIGINT NOT NULL REFERENCES user_farms(id) ON DELETE CASCADE,
    unlock_id VARCHAR(50) NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(farm_id, unlock_id)
);
