# Railway Deployment Guide for GbgGridlock

This guide explains how to deploy GbgGridlock to Railway with automatic database migrations.

## Prerequisites

1. A Railway account at [railway.app](https://railway.app)
2. Västtrafik API credentials from [developer.vasttrafik.se](https://developer.vasttrafik.se/)

## Setup Steps

### 1. Create a New Railway Project

1. Go to [railway.app](https://railway.app) and create a new project
2. Connect your GitHub repository

### 2. Add TimescaleDB Service

Railway has native TimescaleDB support:

1. Click "New Service" → "Database" → "TimescaleDB"
2. Railway will automatically create the database and set the `DATABASE_URL` environment variable

### 3. Configure Environment Variables

Add the following environment variables to your Railway service:

**Required:**
- `DATABASE_URL` - Automatically set by Railway's TimescaleDB service
- `VT_CLIENT_ID` - Your Västtrafik API client ID
- `VT_CLIENT_SECRET` - Your Västtrafik API client secret
- `VT_AUTH_KEY` - Your Västtrafik auth key (required for Planera Resa v4 access)

**Optional (Worker Configuration):**
- `ENABLE_WORKER` - Set to `true` to enable background polling (default: `false`)
- `WORKER_INTERVAL_SECONDS` - Polling interval in seconds (default: `60`)
- `WORKER_HTTP_CONCURRENCY` - Max concurrent API requests (default: `5`)

### 4. Deploy

Railway will automatically detect the `railway.toml` configuration file and:

1. Install system dependencies (including curl)
2. Install `uv` and sync backend dependencies from `backend/pyproject.toml`
3. **Run database migrations automatically** before starting the service
4. Start the FastAPI application with `uv run uvicorn`
5. Enable health checks at `/health`

## How Migrations Work

The deployment process runs migrations automatically via the `preDeployCommand` in `railway.toml`:

```toml
[deploy]
preDeployCommand = ["export PATH=\"$HOME/.local/bin:$PATH\" && cd backend && uv run alembic upgrade head"]
startCommand = "export PATH=\"$HOME/.local/bin:$PATH\" && cd backend && uv run uvicorn gbg_gridlock_api.main:app --host 0.0.0.0 --port $PORT"
```

The pre-deploy command runs between building and deploying the application, ensuring migrations complete before the service starts.

### Alembic Migration System

GbgGridlock uses [Alembic](https://alembic.sqlalchemy.org/) for database schema management:

1. **Build Phase**: System packages are installed via `apt-get`, then `uv` is installed via its official installer and used to sync backend dependencies from `backend/pyproject.toml`
2. **Pre-Deploy Phase**: `uv run alembic upgrade head` runs all pending migrations from `backend/alembic/versions/`
3. **Idempotent**: Alembic tracks applied revisions in `alembic_version`, only running new ones
4. **Rollback Support**: Each migration has a corresponding `downgrade()` implementation
5. **Failure Handling**: If any migration fails, Railway aborts the deployment


Migration files are located in:
- `backend/alembic.ini` - Alembic runtime config
- `backend/alembic/env.py` - Alembic environment setup
- `backend/alembic/versions/*.py` - Versioned migration scripts

## Monitoring

- **Health Check**: Railway will monitor the `/health` endpoint every 100 seconds
- **Logs**: View logs in the Railway dashboard under your service
- **Metrics**: Railway provides CPU, memory, and network usage metrics

## Worker Mode

The integrated polling worker is **disabled by default** to conserve resources. To enable it:

1. Set `ENABLE_WORKER=true` in your Railway environment variables
2. Ensure `VT_CLIENT_ID` and `VT_CLIENT_SECRET` are set
3. Redeploy the service

When enabled, the worker will:
- Poll Västtrafik API every 60 seconds (configurable)
- Store delay data in the TimescaleDB database
- Run within the same process as the FastAPI server

## Troubleshooting

### Migrations Failing

Check Railway logs for Alembic migration errors:
```
alembic upgrade head failed
```

Common causes:
- TimescaleDB extension not available (should be automatic on Railway)
- Database connection issues (verify `DATABASE_URL` is set correctly)
- SQL syntax errors in migration files
- Missing Alembic dependencies (installed during build)
- `uv` is unavailable on `PATH` during start (the command now prepends `$HOME/.local/bin`)

To troubleshoot locally:
```bash
docker compose up -d db
cd backend && uv run alembic upgrade head
```

### Worker Not Starting

Check logs for:
```
ERROR: Worker enabled but VT_CLIENT_ID or VT_CLIENT_SECRET not set
```

Ensure Västtrafik credentials and the auth key are set in Railway environment variables.

### Health Check Failures

Railway will restart the service if `/health` doesn't respond. Check:
- Database connection is established
- `DATABASE_URL` is correctly set
- No startup errors in logs

## Local Development

To run locally with the same configuration:

1. Start the database:
   ```bash
   docker compose up -d db
   ```

2. Run migrations with Alembic:
   ```bash
   cd backend && uv run alembic upgrade head
   ```

3. Configure the backend:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your DATABASE_URL and Västtrafik credentials
   ```

4. Start the server:
   ```bash
   cd backend
   uv sync
   uv run uvicorn gbg_gridlock_api.main:app --reload
   ```

## Support

- Railway Documentation: [docs.railway.com](https://docs.railway.com)
- Alembic Documentation: [alembic.sqlalchemy.org](https://alembic.sqlalchemy.org/)
- TimescaleDB Docs: [docs.timescale.com](https://docs.timescale.com)
- Västtrafik API: [developer.vasttrafik.se](https://developer.vasttrafik.se/)
