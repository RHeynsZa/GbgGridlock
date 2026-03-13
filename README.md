# GbgGridlock

GbgGridlock is a real-time analytics dashboard for visualizing transit pain points in Gothenburg's Västtrafik network.

## Monorepo layout

- `worker/` – Async polling ingestion service (Planera Resa v4 -> TimescaleDB)
- `backend/` – FastAPI aggregation API for dashboard consumption
- `frontend/` – React dashboard UI (wall of shame, route deep dive, health indicator)
- `backend/alembic/` – Alembic migrations for TimescaleDB schema lifecycle

## Quick start

### 1) Database

```bash
# Preferred on normal hosts
docker compose up -d db

# If running inside a nested container where compose fails on timescaledb-tune,
# use this instead:
docker run -d --name gbggridlock-db \
  -e POSTGRES_USER=gbg -e POSTGRES_PASSWORD=gbg -e POSTGRES_DB=gbggridlock \
  -e NO_TS_TUNE=true \
  -p 5432:5432 \
  timescale/timescaledb:latest-pg16

cd backend && uv run alembic upgrade head
```

If Docker itself fails with `unshare: operation not permitted`, the host/container runtime is blocking required kernel features. In that case, run the DB step on a machine/runner with privileged Docker support.

### 2) Backend API

```bash
cd backend
cp .env.example .env
pip install -e .
uvicorn gbg_gridlock_api.main:app --reload --port 8000
```

### 3) Ingestion worker

```bash
cd worker
cp .env.example .env
pip install -e .
python -m gbg_gridlock_worker.main
```

### 4) Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

## Railway Deployment

For production deployment to Railway with automatic migrations and integrated worker:

1. See detailed instructions in [`RAILWAY_DEPLOYMENT.md`](./RAILWAY_DEPLOYMENT.md)
2. The backend now includes the integrated polling worker (controlled by `ENABLE_WORKER` env var)
3. Migrations run automatically before service startup via `railway.toml`
4. TimescaleDB is provided natively by Railway

Quick Railway setup:
- Connect your repo to Railway
- Add TimescaleDB service
- Set `VT_CLIENT_ID` and `VT_CLIENT_SECRET` (`ENABLE_WORKER` defaults to `true`)
- Deploy automatically runs migrations and starts the API

### Deploy a fully static frontend (GitHub CDN)

The frontend is intentionally hardcoded so it can be shipped as static assets on GitHub Pages (GitHub's CDN-backed hosting). The included workflow `.github/workflows/frontend-pages.yml` builds `frontend/` and deploys `frontend/dist` on pushes to `main`.

Add these GitHub repository secrets before enabling deployment:

- `VITE_POSTHOG_KEY` – your PostHog project key.
- `VITE_POSTHOG_HOST` – optional PostHog host (defaults to `https://eu.i.posthog.com`).

After the workflow runs, your dashboard is served from:

- `https://<org-or-user>.github.io/<repo>/`

For local frontend development without analytics, no secrets are required.



## Testing checklist

When you change code in a component, run that component's checks before opening a PR:

- **Backend changes:** `cd backend && PYTHONPATH=src python3 -m pytest tests/ -v`
- **Worker changes:** `cd worker && PYTHONPATH=src python3 -m pytest tests/ -v`
- **Frontend changes (required):**
  - `cd frontend && npm run build`
  - `cd frontend && npx playwright install chromium` (first run only)
  - `cd frontend && npx playwright install-deps chromium` (CI/container environments)
  - `cd frontend && npm run test:e2e`

The frontend smoke test runs against the built preview app, so running only `npm run build` is not sufficient when UI code changes.

## Notes

- The worker uses OAuth2 client credentials and caches tokens until near expiry.
- Polling is every 60 seconds with an `asyncio.Semaphore(5)` concurrency guard.
- Stop-area polling targets should be maintained in `worker/src/gbg_gridlock_worker/config.py`.
