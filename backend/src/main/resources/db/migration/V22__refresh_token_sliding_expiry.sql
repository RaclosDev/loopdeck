-- Sesiones deslizantes: el refresh token se renueva al usarse, con un tope desde el inicio de sesión.
ALTER TABLE refresh_tokens ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT (now() AT TIME ZONE 'UTC');

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expiry_date ON refresh_tokens (expiry_date);
