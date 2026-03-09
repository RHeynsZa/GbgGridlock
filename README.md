# GbgGridlock

GbgGridlock is a real-time analytics dashboard for visualizing transit pain points in Gothenburg's Västtrafik network.

## Monorepo layout

- `worker/` – Async polling ingestion service (Planera Resa v4 -> TimescaleDB)
- `backend/` – FastAPI aggregation API for dashboard consumption
- `frontend/` – React dashboard UI (wall of shame, route deep dive, health indicator)
- `db/` – SQL bootstrap scripts (schema + hypertable)

## Quick start

### 1) Database

```bash
docker compose up -d db
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

## Notes

- The worker uses OAuth2 client credentials and caches tokens until near expiry.
- Polling is every 60 seconds with an `asyncio.Semaphore(5)` concurrency guard.
- Stop-area polling targets should be maintained in `worker/src/gbg_gridlock_worker/config.py`.
