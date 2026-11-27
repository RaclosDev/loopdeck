-- Control de concurrencia al editar notas: cada edición incrementa la versión.
ALTER TABLE notes ADD COLUMN version BIGINT NOT NULL DEFAULT 0;

-- Dos ediciones simultáneas de una nota cloze podían crear dos tarjetas con el mismo hueco.
-- Antes de imponer la unicidad se aparta, sin borrar nada (sus repasos siguen colgando de la tarjeta),
-- cada tarjeta repetida: se conserva la que más repasos tiene (y, a igualdad, la más antigua) y las demás
-- pasan a ordinales negativos (-1, -2...) únicos por nota y suspendidos, que ningún tipo de nota usa.
WITH ranked AS (
    SELECT id, note_id,
           ROW_NUMBER() OVER (PARTITION BY note_id, card_ordinal
                              ORDER BY COALESCE(repetitions, 0) DESC, created_at ASC NULLS LAST, id ASC) AS keep_rank
    FROM cards
    WHERE card_ordinal IS NOT NULL
), extra AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY note_id ORDER BY id) AS n
    FROM ranked
    WHERE keep_rank > 1
)
UPDATE cards c SET card_ordinal = -extra.n, suspended = TRUE
FROM extra
WHERE c.id = extra.id;

ALTER TABLE cards ADD CONSTRAINT uq_cards_note_ordinal UNIQUE (note_id, card_ordinal);
