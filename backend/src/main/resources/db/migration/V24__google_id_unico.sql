-- Un mismo id de Google no puede pertenecer a dos cuentas: evita que una vinculación concurrente
-- o antigua deje a dos usuarios con la misma identidad externa.
-- Si ya hubiera duplicados (el código no los crea, pero la columna no lo impedía), se conserva la
-- cuenta más antigua y las demás pierden solo el vínculo con Google; no se borra ningún dato.
UPDATE users
SET google_id = NULL
WHERE id IN (
    SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY google_id ORDER BY created_at ASC NULLS LAST, id ASC) AS posicion
        FROM users
        WHERE google_id IS NOT NULL
    ) ordenadas
    WHERE posicion > 1
);

ALTER TABLE users ADD CONSTRAINT uq_users_google_id UNIQUE (google_id);
