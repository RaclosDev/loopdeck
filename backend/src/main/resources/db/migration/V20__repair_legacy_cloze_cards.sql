-- Preserve the original card and its review history when converting ordinal zero.
CREATE TEMPORARY TABLE legacy_cloze_indices ON COMMIT DROP AS
SELECT n.id AS note_id, n.deck_id, c.id AS original_card_id, c.suspended, c.buried,
       ARRAY_AGG(DISTINCT parsed.index::INTEGER ORDER BY parsed.index::INTEGER) AS ordinals
FROM notes n
JOIN cards c ON c.note_id = n.id AND c.card_ordinal = 0
CROSS JOIN LATERAL regexp_matches(n.fields_json->>'text', '\{\{c([0-9]+)::([^}]|\}[^}])+\}\}', 'g') marker(parts)
CROSS JOIN LATERAL (SELECT CASE WHEN LENGTH(LTRIM((marker.parts)[1], '0')) BETWEEN 1 AND 10
    THEN LTRIM((marker.parts)[1], '0')::BIGINT ELSE NULL END AS index) parsed
WHERE n.note_type = 'cloze' AND parsed.index BETWEEN 1 AND 2147483647
  AND NOT EXISTS (SELECT 1 FROM cards other WHERE other.note_id = n.id AND other.id <> c.id)
GROUP BY n.id, n.deck_id, c.id, c.suspended, c.buried
HAVING COUNT(DISTINCT parsed.index) <= 100;

UPDATE cards c SET card_ordinal = repair.ordinals[1]
FROM legacy_cloze_indices repair WHERE c.id = repair.original_card_id;

INSERT INTO cards(id, note_id, deck_id, card_ordinal, state, due, interval_days,
                  ease_factor, repetitions, lapses, learning_step, suspended, buried, is_leech, created_at)
SELECT (MD5(repair.note_id || ':cloze:' || ordinal))::UUID::TEXT,
       repair.note_id, repair.deck_id, ordinal, 'new', CURRENT_TIMESTAMP AT TIME ZONE 'UTC',
       0, 2.5, 0, 0, 0, repair.suspended, repair.buried, FALSE, CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
FROM legacy_cloze_indices repair CROSS JOIN LATERAL unnest(repair.ordinals) ordinal
WHERE ordinal <> repair.ordinals[1];
