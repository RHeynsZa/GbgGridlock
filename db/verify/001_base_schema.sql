BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'departure_delay_events'
  ) THEN
    RAISE EXCEPTION 'departure_delay_events table is missing';
  END IF;
END
$$;

SELECT 1 / CASE WHEN EXISTS (
  SELECT 1
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'departure_delay_events'
    AND indexname = 'idx_delay_events_line_recorded_at'
) THEN 1 ELSE 0 END;

SELECT 1 / CASE WHEN EXISTS (
  SELECT 1
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'departure_delay_events'
    AND indexname = 'idx_delay_events_stop_recorded_at'
) THEN 1 ELSE 0 END;

ROLLBACK;
