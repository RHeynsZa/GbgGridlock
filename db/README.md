# Database migrations

Schema migrations are now managed with **Alembic** from the backend service.

## Canonical migration files

- `backend/alembic.ini` - Alembic runtime config.
- `backend/alembic/env.py` - Alembic environment setup.
- `backend/alembic/versions/*.py` - Versioned migration scripts.

## Local workflow

1. Start PostgreSQL/TimescaleDB:

```bash
docker compose up -d db
```

2. Apply migrations:

```bash
cd backend && uv run alembic upgrade head
```

3. Roll back one migration (if needed):

```bash
cd backend && uv run alembic downgrade -1
```

## Notes

- `db/init.sql` remains a no-op placeholder.
- Legacy migration tooling has been removed from active workflows.
