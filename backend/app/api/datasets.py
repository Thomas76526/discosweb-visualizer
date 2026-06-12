"""Dataset upload / inspection endpoints."""
from __future__ import annotations

import re
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status

from app.core.config import settings
from app.models.dataset import DatasetMeta, DatasetProfile, FieldInfo
from app.services.parser import allowed_extensions, parse_file
from app.services.storage import DatasetStore

router = APIRouter()


# F-05 修复:文件名校验,剥离路径穿越字符
_UNSAFE_FILENAME = re.compile(r"[^A-Za-z0-9._-]")


def _sanitize_filename(raw: str | None) -> str:
    if not raw:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Missing filename")
    # 1) Strip path components (POSIX + Windows separators + null bytes)
    name = Path(raw).name
    if not name or name in (".", ".."):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid filename")
    # 2) Reject hidden files (start with .)
    if name.startswith("."):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Hidden filenames not allowed")
    # 3) Whitelist allowed chars
    cleaned = _UNSAFE_FILENAME.sub("_", name)
    if not cleaned:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Filename has no allowed characters")
    return cleaned


def _validate_extension(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in allowed_extensions():
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Unsupported file type '{ext}'. "
            f"Allowed: {sorted(set(allowed_extensions()))}",
        )
    return ext


def _get_store(request: Request) -> DatasetStore:
    store: DatasetStore | None = getattr(request.app.state, "store", None)
    if store is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Storage not initialized")
    return store


# Configurable max upload size (in MB); default 50MB.
def _max_upload_bytes() -> int:
    return settings.max_upload_mb * 1024 * 1024


@router.post(
    "/upload",
    response_model=DatasetMeta,
    status_code=status.HTTP_201_CREATED,
)
async def upload_dataset(
    request: Request,
    file: Annotated[UploadFile, File(...)],
    store: Annotated[DatasetStore, Depends(_get_store)],
) -> DatasetMeta:
    """Upload a CSV/JSON/Parquet file and persist it as a dataset."""
    safe_name = _sanitize_filename(file.filename)
    ext = _validate_extension(safe_name)

    # Stream the upload with a size cap (F-05: 防止巨型文件耗尽磁盘)
    max_bytes = _max_upload_bytes()
    upload_dir = Path(settings.storage_dir) / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    dataset_id = uuid.uuid4().hex
    target = upload_dir / f"{dataset_id}_{safe_name}"

    bytes_written = 0
    try:
        with target.open("wb") as f:
            while True:
                chunk = await file.read(1024 * 64)  # 64KB chunks
                if not chunk:
                    break
                bytes_written += len(chunk)
                if bytes_written > max_bytes:
                    f.close()
                    target.unlink(missing_ok=True)
                    raise HTTPException(
                        status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        f"File exceeds {settings.max_upload_mb}MB limit",
                    )
                f.write(chunk)
    finally:
        await file.close()

    # Parse
    try:
        df = parse_file(target)
    except ValueError as e:
        # 用户错误:不支持的扩展名、空文件、列名非法
        target.unlink(missing_ok=True)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Invalid file: {e}")
    except Exception:
        # M-05 修复:其它异常(IO 错误、polars ComputeError 等)只记日志,
        # 避免 str(exc) 把绝对路径 / 库内部细节泄露给前端
        target.unlink(missing_ok=True)
        # 真实异常已由 uvicorn 日志记录
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Failed to parse uploaded file")

    # Persist
    store.save(dataset_id, safe_name, df)

    # Build response
    fields = [FieldInfo(name=col, type=str(df[col].dtype)) for col in df.columns]
    sample = df.head(5).to_dicts() if df.height > 0 else []
    return DatasetMeta(
        id=dataset_id,
        name=safe_name,
        rows=df.height,
        fields=fields,
        sample=sample,
    )


@router.get("/{dataset_id}", response_model=DatasetMeta)
async def get_dataset(
    dataset_id: str,
    store: Annotated[DatasetStore, Depends(_get_store)],
) -> DatasetMeta:
    """Return dataset metadata + first 5 sample rows."""
    if not store.exists(dataset_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Dataset not found: {dataset_id}")
    meta = store.get_meta(dataset_id)
    # Build a sample by loading the table (cheap for small datasets; in M1.5 we'll
    # add a separate "load N rows" method to avoid full table scans for big data)
    df = store.get_table(dataset_id)
    fields = [FieldInfo(name=col, type=str(df[col].dtype)) for col in df.columns]
    sample = df.head(5).to_dicts() if df.height > 0 else []
    return DatasetMeta(
        id=meta["id"],
        name=meta["name"],
        rows=meta["rows"],
        fields=fields,
        sample=sample,
    )


@router.get("/{dataset_id}/profile", response_model=DatasetProfile)
async def get_dataset_profile(
    dataset_id: str,
    store: Annotated[DatasetStore, Depends(_get_store)],
) -> DatasetProfile:
    """Return per-field statistics (nulls, distinct, min/max, top values)."""
    if not store.exists(dataset_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Dataset not found: {dataset_id}")
    return DatasetProfile(fields=store.profile(dataset_id))


@router.post(
    "/from-sample",
    response_model=DatasetMeta,
    status_code=status.HTTP_201_CREATED,
)
async def load_sample(
    store: Annotated[DatasetStore, Depends(_get_store)],
) -> DatasetMeta:
    """Load the bundled sample CSV (data/sample/sample-sales-2025.csv).

    The sample path is resolved relative to the backend's working directory
    (inside Docker: /app/data/sample/sample-sales-2025.csv, via the :ro bind
    mount configured in docker-compose.yml).
    """
    # Find the sample: try both the compose-mounted path and a repo-relative fallback
    candidates = [
        Path("/app/data/sample/sample-sales-2025.csv"),  # in Docker
        Path(__file__).resolve().parents[3] / "data" / "sample" / "sample-sales-2025.csv",  # local dev
    ]
    sample_path = next((p for p in candidates if p.exists()), None)
    if sample_path is None:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Sample data not found",
        )

    try:
        df = parse_file(sample_path)
    except Exception as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Parse error: {e}")

    dataset_id = "sample-" + uuid.uuid4().hex[:8]
    store.save(dataset_id, "sample-sales-2025.csv", df)

    fields = [FieldInfo(name=col, type=str(df[col].dtype)) for col in df.columns]
    sample = df.head(5).to_dicts() if df.height > 0 else []
    return DatasetMeta(
        id=dataset_id,
        name="sample-sales-2025.csv",
        rows=df.height,
        fields=fields,
        sample=sample,
    )
