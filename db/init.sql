CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS departure_delay_events (
  recorded_at TIMESTAMPTZ NOT NULL,
  stop_gid VARCHAR NOT NULL,
  journey_gid VARCHAR NOT NULL,
  line_number VARCHAR NOT NULL,
  planned_time TIMESTAMPTZ NOT NULL,
  estimated_time TIMESTAMPTZ,
  delay_seconds INTEGER,
  is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  realtime_missing BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (recorded_at, stop_gid, journey_gid)
);

SELECT create_hypertable('departure_delay_events', 'recorded_at', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_delay_events_line_recorded_at
  ON departure_delay_events (line_number, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_delay_events_stop_recorded_at
  ON departure_delay_events (stop_gid, recorded_at DESC);
