"""Chart preview endpoint — runs aggregation against DuckDB and returns series."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.models.dataset import ChartPreview, ChartSpec
from app.services.storage import DatasetStore, aggregate

router = APIRouter()


def _get_store(request: Request) -> DatasetStore:
    store: DatasetStore | None = getattr(request.app.state, "store", None)
    if store is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Storage not initialized")
    return store


@router.post("/preview", response_model=ChartPreview)
async def preview_chart(
    spec: ChartSpec,
    store: Annotated[DatasetStore, Depends(_get_store)],
) -> ChartPreview:
    """Aggregate the dataset per the chart spec and return series for charting."""
    if not store.exists(spec.dataset_id):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"Dataset not found: {spec.dataset_id}",
        )
    # aggregation defaults to "sum" if not provided
    agg = spec.aggregation or "sum"
    result = aggregate(
        store,
        spec.dataset_id,
        x_field=spec.x_field,
        y_field=spec.y_field,
        aggregation=agg,
        group_by=spec.group_by,
    )
    return ChartPreview(series=result["series"])
