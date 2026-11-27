-- Tarjetas hermanas enterradas: cuándo se enterró cada una, para devolverla al empezar el siguiente día de estudio.
ALTER TABLE cards ADD COLUMN buried_at TIMESTAMP;
CREATE INDEX idx_cards_buried ON cards(buried_at) WHERE buried;

-- Las columnas TIMESTAMP guardan UTC (Hibernate escribe en UTC). Si la sesión de base de datos no está en UTC,
-- CURRENT_TIMESTAMP guardaría la hora local y en el cambio de hora los vencimientos se moverían una hora.
-- Solo se cambia el valor por defecto de lo que se inserte en adelante; los datos existentes no se tocan.
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'UTC');
ALTER TABLE deck_presets ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'UTC');
ALTER TABLE decks ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'UTC');
ALTER TABLE notes ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'UTC');
ALTER TABLE notes ALTER COLUMN updated_at SET DEFAULT (now() AT TIME ZONE 'UTC');
ALTER TABLE cards ALTER COLUMN due SET DEFAULT (now() AT TIME ZONE 'UTC');
ALTER TABLE cards ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'UTC');
ALTER TABLE reviews ALTER COLUMN reviewed_at SET DEFAULT (now() AT TIME ZONE 'UTC');
ALTER TABLE note_imports ALTER COLUMN created_at SET DEFAULT (now() AT TIME ZONE 'UTC');
