# GbgGridlock Backend API

FastAPI backend for the GbgGridlock transit analytics dashboard.

## Local development

```bash
uv sync
uv run uvicorn gbg_gridlock_api.main:app --reload --port 8000
```

## Tests

```bash
python3 -m pytest tests/ -v
```

## Build

```bash
python3 -m build
```
