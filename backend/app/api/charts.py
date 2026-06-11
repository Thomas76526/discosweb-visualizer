"""Chart preview endpoint."""
from fastapi import APIRouter

from app.models.dataset import ChartSpec, ChartPreview

router = APIRouter()


@router.post("/preview", response_model=ChartPreview)
async def preview_chart(spec: ChartSpec) -> ChartPreview:
    # TODO: run aggregation against DuckDB, build series for frontend charting
    return ChartPreview(series=[])
