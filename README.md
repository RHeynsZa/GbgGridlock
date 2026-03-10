# GbgGridlock

GbgGridlock is a real-time analytics dashboard for visualizing transit pain points in Gothenburg's Västtrafik network.

## Monorepo layout

- `worker/` – Async polling ingestion service (Planera Resa v4 -> TimescaleDB)
- `backend/` – FastAPI aggregation API for dashboard consumption
- `frontend/` – React dashboard UI (wall of shame, route deep dive, health indicator)
- `db/` – Sqitch migrations for TimescaleDB schema lifecycle

## Quick start

### 1) Database

```bash
docker compose up -d db
docker compose run --rm --profile tools db-migrate
```

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

### 5) Deploy a fully static frontend (GitHub CDN)

The frontend is intentionally hardcoded so it can be shipped as static assets on GitHub Pages (GitHub's CDN-backed hosting). The included workflow `.github/workflows/frontend-pages.yml` builds `frontend/` and deploys `frontend/dist` on pushes to `main`.

Add these GitHub repository secrets before enabling deployment:

- `VITE_POSTHOG_KEY` – your PostHog project key.
- `VITE_POSTHOG_HOST` – optional PostHog host (defaults to `https://eu.i.posthog.com`).

After the workflow runs, your dashboard is served from:

- `https://<org-or-user>.github.io/<repo>/`

For local frontend development without analytics, no secrets are required.


## Notes

- The worker uses OAuth2 client credentials and caches tokens until near expiry.
- Polling is every 60 seconds with an `asyncio.Semaphore(5)` concurrency guard.
- Stop-area polling targets should be maintained in `worker/src/gbg_gridlock_worker/config.py`.
