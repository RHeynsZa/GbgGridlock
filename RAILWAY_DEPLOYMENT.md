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

**Optional (Worker Configuration):**
- `ENABLE_WORKER` - Set to `true` to enable background polling (default: `false`)
- `WORKER_INTERVAL_SECONDS` - Polling interval in seconds (default: `60`)
- `WORKER_HTTP_CONCURRENCY` - Max concurrent API requests (default: `5`)

### 4. Deploy

Railway will automatically detect the `railway.toml` configuration file and:

1. Install Python dependencies
2. **Run database migrations automatically** before starting the service
3. Start the FastAPI application with uvicorn
4. Enable health checks at `/health`

## How Migrations Work

The deployment process runs migrations automatically via the `preDeployCommand` in `railway.toml`:

```toml
[deploy]
preDeployCommand = ["cd db && sqitch deploy $DATABASE_URL"]
startCommand = "cd backend && uvicorn gbg_gridlock_api.main:app --host 0.0.0.0 --port $PORT"
```

The pre-deploy command runs between building and deploying the application, ensuring migrations complete before the service starts.

### Sqitch Migration System

GbgGridlock uses [Sqitch](https://sqitch.org/) for database schema management:

1. **Build Phase**: Sqitch and PostgreSQL client tools are installed via `apt-get` during the build
2. **Pre-Deploy Phase**: `sqitch deploy` runs all pending migrations from `db/deploy/` in order defined by `db/sqitch.plan`
3. **Idempotent**: Sqitch tracks applied migrations in the database, only running new ones
4. **Rollback Support**: Each migration has a corresponding revert script in `db/revert/`
5. **Verification**: Each migration includes a verify script in `db/verify/` for integrity checks
6. **Failure Handling**: If any migration fails, Railway aborts the deployment

Migration files are located in:
- `db/sqitch.plan` - Migration plan and order
- `db/deploy/*.sql` - Forward migrations
- `db/revert/*.sql` - Rollback scripts
- `db/verify/*.sql` - Validation checks

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

Check Railway logs for Sqitch migration errors:
```
sqitch deploy failed
```

Common causes:
- TimescaleDB extension not available (should be automatic on Railway)
- Database connection issues (verify `DATABASE_URL` is set correctly)
- SQL syntax errors in migration files
- Missing Sqitch dependencies (should be installed during build)

To troubleshoot locally:
```bash
docker compose up -d db
docker compose run --rm --profile tools db-migrate
```

### Worker Not Starting

Check logs for:
```
ERROR: Worker enabled but VT_CLIENT_ID or VT_CLIENT_SECRET not set
```

Ensure both Västtrafik credentials are set in Railway environment variables.

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

2. Run migrations with Sqitch:
   ```bash
   docker compose run --rm --profile tools db-migrate
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
   uvicorn gbg_gridlock_api.main:app --reload
   ```

## Support

- Railway Documentation: [docs.railway.com](https://docs.railway.com)
- Sqitch Documentation: [sqitch.org](https://sqitch.org/)
- TimescaleDB Docs: [docs.timescale.com](https://docs.timescale.com)
- Västtrafik API: [developer.vasttrafik.se](https://developer.vasttrafik.se/)
