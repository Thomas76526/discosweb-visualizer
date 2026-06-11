# discosweb-visualizer backend

FastAPI + Polars + DuckDB service for the discosweb-visualizer frontend.

## Quick start

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Open http://localhost:8000/docs for the interactive OpenAPI explorer.

## Docker

```bash
docker build -t discosweb-visualizer-backend .
docker run --rm -p 8000:8000 discosweb-visualizer-backend
```

## Configuration

Environment variables (prefix `APP_`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `APP_CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed CORS origins |
| `APP_STORAGE_DIR` | `./data` | Where uploaded files land |
| `APP_DUCKDB_PATH` | `./data/visualizer.duckdb` | Embedded DuckDB file |

## API

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/health` | Liveness probe |
| POST   | `/api/datasets/upload` | Upload CSV / JSON / Parquet |
| GET    | `/api/datasets/{id}` | Dataset metadata + sample |
| GET    | `/api/datasets/{id}/profile` | Per-field statistics |
| POST   | `/api/charts/preview` | Aggregate data for a chart |
