# Railway Deployment Guide for GbgGridlock

This guide walks through deploying GbgGridlock to Railway with TimescaleDB.

## Prerequisites

1. A Railway account at [railway.app](https://railway.app)
2. Västtrafik API credentials from [developer.vasttrafik.se](https://developer.vasttrafik.se/)

## Deployment Steps

### 1. Set Up TimescaleDB

1. In your Railway project, click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Once created, click on the database service
3. Go to **Settings** → **Environment Variables** and note the `DATABASE_URL`
4. Railway's PostgreSQL doesn't have TimescaleDB by default. You have two options:
   - Use Railway's marketplace TimescaleDB template (recommended)
   - Deploy a custom TimescaleDB container

### 2. Deploy the Backend API

1. In your Railway project, click **"+ New"** → **"GitHub Repo"**
2. Connect your GbgGridlock repository
3. Railway will automatically detect the `railway.toml` configuration

### 3. Configure Environment Variables

In your Railway backend service, add these environment variables:

**Required:**
- `DATABASE_URL` - Copy from your TimescaleDB service (Railway will auto-inject if linked)
- `VT_CLIENT_ID` - Your Västtrafik API client ID
- `VT_CLIENT_SECRET` - Your Västtrafik API client secret

**Optional:**
- `ENABLE_WORKER` - Set to `true` to enable the polling worker (default: true)
- `POLL_INTERVAL_SECONDS` - Polling interval in seconds (default: 60)
- `HTTP_CONCURRENCY` - Max concurrent API requests (default: 5)
- `VT_TOKEN_URL` - Västtrafik token endpoint (default: https://ext-api.vasttrafik.se/token)
- `VT_API_BASE_URL` - Västtrafik API base URL (default: https://ext-api.vasttrafik.se/pr/v4)

### 4. Run Database Migrations

After the backend deploys, run the database migration:

```bash
# Using Railway CLI
railway run psql $DATABASE_URL < db/deploy/001_base_schema.sql
```

Or connect to your database directly and run the migration script.

### 5. Verify Deployment

1. Check the backend logs in Railway to confirm:
   - Database connection successful
   - Worker scheduler started (if enabled)
   - Initial line metadata fetch completed
2. Test the API health endpoint: `https://your-app.railway.app/health`

## Architecture Notes

### Integrated Worker

The polling worker is now integrated into the FastAPI backend using APScheduler. This means:
- Only one service needs to be deployed (instead of separate API + worker)
- The worker can be disabled by setting `ENABLE_WORKER=false` for read-only deployments
- Worker credentials can be managed alongside API configuration

### Environment Variables

Railway automatically injects service references as environment variables. When you link the TimescaleDB service to your backend, `DATABASE_URL` will be automatically provided.

### Health Checks

The `/health` endpoint is configured in `railway.toml` for Railway's health check system. The service will be marked as healthy once this endpoint returns successfully.

## Troubleshooting

### Worker Not Starting

Check logs for:
- Missing `VT_CLIENT_ID` or `VT_CLIENT_SECRET`
- Set `ENABLE_WORKER=true` explicitly if needed
- Verify Västtrafik API credentials are correct

### Database Connection Issues

- Ensure TimescaleDB service is running
- Verify `DATABASE_URL` is correctly set
- Check that the database migration has been applied
- Confirm the database has the TimescaleDB extension enabled

### Rate Limiting

If you see HTTP 429 errors from Västtrafik:
- Reduce `HTTP_CONCURRENCY` (default is 5)
- Increase `POLL_INTERVAL_SECONDS` (default is 60)
- Check your Västtrafik API tier limits

## Cost Optimization

For low-traffic testing:
- Use Railway's Hobby plan
- Set `POLL_INTERVAL_SECONDS=120` or higher
- Reduce `HTTP_CONCURRENCY=3`

## Next Steps

After deployment:
1. Deploy the frontend to Railway or Vercel
2. Configure the frontend's `VITE_API_BASE_URL` to point to your Railway backend
3. Monitor the backend logs to ensure polling is working correctly
4. Check the database to confirm departure events are being inserted
