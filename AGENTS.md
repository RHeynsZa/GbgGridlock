# AGENTS.md

## Cursor Cloud specific instructions

### Overview

GbgGridlock is a monorepo with four components: `frontend/` (React/Vite), `backend/` (FastAPI), `worker/` (async poller), and `db/` (Sqitch migrations on TimescaleDB). See `README.md` for quick-start commands.

### Services

| Service | Port | Command |
|---|---|---|
| TimescaleDB | 5432 | `docker run -d --name gbggridlock-db -e POSTGRES_USER=gbg -e POSTGRES_PASSWORD=gbg -e POSTGRES_DB=gbggridlock -e NO_TS_TUNE=true -p 5432:5432 timescale/timescaledb:latest-pg16` |
| DB Migrations | — | `docker run --rm --network host -v ./db:/work:ro -w /work sqitch/sqitch:latest deploy db:pg://gbg:gbg@localhost:5432/gbggridlock` |
| Backend API | 8000 | `cd backend && uvicorn gbg_gridlock_api.main:app --reload --port 8000` |
| Frontend | 5173 | `cd frontend && VITE_API_BASE_URL=http://localhost:8000 npm run dev` |
| Worker (optional) | — | Requires `VT_CLIENT_ID` / `VT_CLIENT_SECRET` env vars for Västtrafik API |

### Key caveats

- **TimescaleDB tuning crash in nested Docker**: The default `docker compose up -d db` may crash because `timescaledb-tune` panics when `/sys/fs/cgroup/memory.max` is missing. Set `NO_TS_TUNE=true` when starting the container (or use the `docker run` command above).
- **Docker socket permissions**: After starting `dockerd`, run `sudo chmod 666 /var/run/docker.sock` if you get permission-denied errors.
- **Frontend `VITE_API_BASE_URL`**: Set to `http://localhost:8000` when running frontend dev server so axios calls reach the backend.
- **No eslint config**: The project has no eslint config. Linting is limited to `tsc --noEmit` (with known `import.meta.env` type errors due to missing `vite-env.d.ts`; the Vite build still succeeds).
- **Seeding test data**: Without the worker (which needs Västtrafik credentials), the database is empty. You can seed data directly via SQL inserts to `departure_delay_events`.

### Testing

- **Backend**: `cd backend && python3 -m pytest tests/ -v`
- **Worker**: `cd worker && python3 -m pytest tests/ -v`
- **Frontend build**: `cd frontend && npx vite build`
- **Frontend e2e** (Playwright): `cd frontend && npx playwright test` (requires Chromium; runs build + preview)
