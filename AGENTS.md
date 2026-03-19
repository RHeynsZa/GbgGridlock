# GbgGridlock: AI Agent & Developer Guidelines (AGENTS.md)

## System Context
GbgGridlock is a real-time transit analytics dashboard for the Gothenburg Västtrafik network. It tracks, aggregates, and visualizes delays to highlight the worst-performing public transit lines. 

**Critical Architectural Constraint:** Västtrafik does not support the GTFS-RT standard. All real-time data must be fetched via the proprietary Västtrafik Planera Resa v4 REST API using a smart-polling "chokepoint" strategy to avoid rate limits.

---

## Global Repository Rules
* **Language:** Python 3.12+ (Backend), TypeScript (Frontend), standard SQL.
* **Paradigm:** Asynchronous first. Use `async`/`await` patterns for all network and database I/O.
* **Error Handling:** Fail gracefully. Network APIs are fragile; expect `HTTP 429 Too Many Requests` and `HTTP 500` errors from the transit API and handle them with exponential backoff.
* **Timezones:** All timestamps must be handled, stored, and parsed in UTC, and explicitly converted to `Europe/Stockholm` only at the final presentation layer in the frontend.
* **Testing & Branching:** Tests must pass for every component touched in a branch. If an agent modifies a function, endpoint, or UI component, it must also run, update, or write the corresponding tests (e.g., `pytest` for Python, `Vitest`/`Jest` for frontend) to ensure 100% passing status before considering the task complete.

---

## Agent-Specific Instructions

### 1. The Backend API Agent (FastAPI with Integrated Worker)
The backend serves aggregated data to the frontend and includes an optional integrated polling worker for ingesting real-time data from the Västtrafik API.
* **Core Libraries:** `fastapi`, `pydantic`, `asyncpg`, `httpx` (for async HTTP requests), `apscheduler` (for cron-like interval execution).
* **Strict Rules:**
  * API endpoints must be strictly read-only (`GET`).
  * Response models must be strictly typed using Pydantic.
  * Do not expose raw internal `journey_gid` or `stop_gid` values to the frontend unless absolutely necessary; map them to human-readable stop names and line numbers.
  * **Worker Mode:** When enabled (`ENABLE_WORKER=true`), the worker polls the Västtrafik API every 60 seconds using `asyncio.Semaphore` (max 5 concurrent connections) and manages OAuth2 Bearer tokens independently, requesting refresh only when TTL drops below 5 minutes.
  * Do not use `requests` or `aiohttp`. Only use `httpx.AsyncClient`.

### 2. The Database Agent (TimescaleDB)
All data persistence rules for the PostgreSQL/TimescaleDB layer.
* **Core Paradigm:** Time-series optimization. 
* **Strict Rules:**
  * The primary table `departure_logs` must be configured as a TimescaleDB hypertable partitioned on the `recorded_at` column.
  * Never use ORMs (like SQLAlchemy or Prisma) for bulk ingestion. The worker must use raw SQL `executemany` for high-throughput inserts.
  * Build materialized views for heavy aggregations (e.g., daily route averages) rather than running expensive queries on the raw hypertable on every frontend load.

### 3. The Frontend Agent (React/TypeScript)
The UI layer visualizing the transit pain points.
* **Core Libraries:** React, TypeScript, Tailwind CSS, `shadcn/ui`, TanStack Router, TanStack Query, Recharts.
* **Strict Rules:**
  * **Routing:** Strictly use TanStack Router. Do not use `react-router-dom` or Next.js App/Pages routing.
  * **Data Fetching & State:** Strictly use TanStack Query (`useQuery`, `useMutation`). Do not use `useEffect` for data fetching. Rely on TanStack Query for caching, loading, and error states.
  * **UI Components:** Use `shadcn/ui` components structured with Tailwind CSS utility classes. Avoid writing custom CSS files.
  * **Data Flow:** Do not make any direct calls to the Västtrafik API from the browser. All data must flow exclusively through the FastAPI backend.
  * **Visualizations:** Charts (via Recharts or similar) must correctly handle and visualize right-skewed statistical distributions, as transit delays cannot drop below zero but can extend indefinitely.
  * **UI/UX Design System:** The repository includes the UI/UX Pro Max skill (`.cursor/skills/ui-ux-pro-max/` and `.codex/skills/ui-ux-pro-max/`) which provides intelligent design system generation. When building UI components, the skill auto-activates with natural language requests. The GbgGridlock design system uses: Flat Design style, Indigo primary (#6366F1), Emerald CTA (#10B981), Fira Code/Sans typography, and WCAG AAA accessibility compliance. See `.cursor/skills/README.md` for usage details.

---

## Cursor Cloud specific instructions

### Services overview

| Service | Stack | Port | Start command |
|---------|-------|------|---------------|
| TimescaleDB | Docker (`timescale/timescaledb:latest-pg16`) | 5432 | See below |
| Backend API (with integrated worker) | Python 3.12 / FastAPI / asyncpg / httpx / APScheduler | 8000 | `cd backend && uvicorn gbg_gridlock_api.main:app --reload --port 8000` (Set `ENABLE_WORKER=true` and `VT_CLIENT_ID` / `VT_CLIENT_SECRET` to enable polling) |
| Frontend | React 18 / Vite / TypeScript | 5173 | `cd frontend && VITE_API_BASE_URL=http://localhost:8000 npm run dev` |

### Starting TimescaleDB (Docker-in-Docker gotcha)

The standard `docker compose up -d db` fails in nested container environments because the TimescaleDB `timescaledb-tune` init script panics when it cannot read `/sys/fs/cgroup/memory.max`. Use `docker run` directly with `NO_TS_TUNE=true`:

```bash
docker run -d --name gbggridlock-db \
  -e POSTGRES_USER=gbg -e POSTGRES_PASSWORD=gbg -e POSTGRES_DB=gbggridlock \
  -e NO_TS_TUNE=true \
  -p 5432:5432 \
  timescale/timescaledb:latest-pg16
```

After it is healthy (`docker exec gbggridlock-db pg_isready -U gbg -d gbggridlock`), apply the migration manually:

```bash
docker exec -i gbggridlock-db psql -U gbg -d gbggridlock < /workspace/db/deploy/001_base_schema.sql
```

### Running tests

* **Backend:** `cd backend && python3 -m pytest tests/ -v` (uses monkeypatched fakes; no DB needed)
* **Frontend build:** `cd frontend && npm run build` (Vite build; verifies compilation)
* **Frontend E2E:** `cd frontend && npx playwright test` (requires `npx playwright install chromium` first; uses preview server on port 4173)

### Notes

* Backend `.env` file: copy `backend/.env.example` to `backend/.env` (default `DATABASE_URL` works with the local Docker DB).
* `npx tsc --noEmit` in the frontend reports errors about `import.meta.env` because the repo is missing `vite/client` types; this is a pre-existing issue and does not affect Vite builds.
* The frontend needs `VITE_API_BASE_URL=http://localhost:8000` at dev-server start time to reach the backend (Vite env vars are compile-time only).
