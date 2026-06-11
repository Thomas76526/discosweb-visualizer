"""Dataset upload / inspection endpoints."""
from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.models.dataset import DatasetMeta, FieldInfo

router = APIRouter()


@router.post("/upload", response_model=DatasetMeta, status_code=status.HTTP_201_CREATED)
async def upload_dataset(file: UploadFile = File(...)) -> DatasetMeta:
    # TODO: persist file to storage, parse with Polars, register in DuckDB
    if not file.filename:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Missing filename")
    return DatasetMeta(
        id="placeholder-id",
        name=file.filename,
        rows=0,
        fields=[FieldInfo(name="col", type="string")],
    )


@router.get("/{dataset_id}", response_model=DatasetMeta)
async def get_dataset(dataset_id: str) -> DatasetMeta:
    # TODO: look up dataset by id and return metadata + sample rows
    return DatasetMeta(id=dataset_id, name="placeholder", rows=0, fields=[])


@router.get("/{dataset_id}/profile")
async def get_dataset_profile(dataset_id: str) -> dict[str, list[dict[str, object]]]:
    # TODO: compute nulls / distinct / min / max / top via DuckDB
    return {"fields": []}
