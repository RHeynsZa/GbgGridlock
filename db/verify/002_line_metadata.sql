BEGIN;

SELECT line_number, foreground_color, background_color, text_color, border_color, last_seen_at, updated_at
FROM line_metadata
WHERE FALSE;

ROLLBACK;
