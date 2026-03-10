# Database migrations (Sqitch)

The database schema is managed with [Sqitch](https://sqitch.org/) and lives in this folder.

## Files

- `sqitch.plan` - migration plan and order.
- `deploy/*.sql` - forward migrations.
- `revert/*.sql` - rollback migrations.
- `verify/*.sql` - validation checks.

## Local workflow

1. Start PostgreSQL/TimescaleDB:

```bash
docker compose up -d db
```

2. Apply migrations:

```bash
docker compose run --rm --profile tools db-migrate
```

3. Verify migrations:

```bash
docker compose run --rm --profile tools db-migrate verify db:pg://gbg:gbg@db:5432/gbggridlock
```

4. Revert the latest migration (if needed):

```bash
docker compose run --rm --profile tools db-migrate revert db:pg://gbg:gbg@db:5432/gbggridlock
```

## Notes

- `init.sql` is intentionally a no-op placeholder now; schema setup is migration-driven.
- The migration container runs only when explicitly invoked via the `tools` profile.
