"""FastAPI entrypoint for the discosweb-visualizer backend."""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import charts, datasets
from app.core.config import settings
from app.services.storage import DatasetStore


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Initialize DuckDB-backed store on startup, release on shutdown."""
    # Resolve storage paths (env vars may override defaults)
    storage_dir = Path(settings.storage_dir)
    storage_dir.mkdir(parents=True, exist_ok=True)
    duckdb_path = Path(settings.duckdb_path)
    if duckdb_path.parent != Path("."):
        duckdb_path.parent.mkdir(parents=True, exist_ok=True)

    # Build the store once and stash it on app.state for dependency injection
    store = DatasetStore(duckdb_path=duckdb_path)
    _.state.store = store  # type: ignore[attr-defined]
    try:
        yield
    finally:
        store.close()


app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    lifespan=lifespan,
)

# F-01 修复:收紧 CORS(明确 methods/headers,不放 *)
# 注:生产环境应改为同源部署,本配置是开发期的合理宽度
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600,
)

app.include_router(datasets.router, prefix="/api/datasets", tags=["datasets"])
app.include_router(charts.router, prefix="/api/charts", tags=["charts"])


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


# 统一错误响应(envelope 格式与前端 api/client.ts 对齐)
@app.exception_handler(Exception)
async def unhandled_exception(_: Request, exc: Exception) -> JSONResponse:
    # 让 HTTPException 由 FastAPI 默认处理;其它异常包成 envelope
    if hasattr(exc, "status_code"):
        raise exc
    return JSONResponse(
        status_code=500,
        content={"data": None, "error": {"message": str(exc), "code": "INTERNAL"}},
    )
