ALTER TABLE notes ALTER COLUMN fields_json DROP DEFAULT;
UPDATE notes SET fields_json = '{}' WHERE fields_json = '' OR fields_json IS NULL;
ALTER TABLE notes ALTER COLUMN fields_json TYPE jsonb USING fields_json::jsonb;
ALTER TABLE notes ALTER COLUMN fields_json SET DEFAULT '{}'::jsonb;
