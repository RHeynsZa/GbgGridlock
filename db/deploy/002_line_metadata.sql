BEGIN;

CREATE TABLE IF NOT EXISTS line_metadata (
  line_number VARCHAR PRIMARY KEY,
  foreground_color VARCHAR,
  background_color VARCHAR,
  text_color VARCHAR,
  border_color VARCHAR,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_line_metadata_updated_at
  ON line_metadata (updated_at DESC);

COMMIT;
