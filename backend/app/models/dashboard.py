"""Pydantic models for dashboards.

A dashboard is a collection of charts with grid layout metadata. Each chart
references a dataset by id and stores a chart spec (x/y/group_by/aggregation)
so it can be re-rendered without re-uploading the dataset.
"""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

# Same identifier rules as datasets (H-08/H-09 defense in depth)
_IDENT_PATTERN = r"^[A-Za-z_一-鿿][A-Za-z0-9_一-鿿.]{0,63}$"

# Short id for sharing links: 6 lowercase alphanum chars, no ambiguous chars
SHORT_ID_PATTERN = r"^[a-z2-9]{6}$"
SHORT_ID_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"  # no 0/o/1/l for human clarity


class ChartItem(BaseModel):
    """One chart cell in a dashboard grid."""

    id: str = Field(..., pattern=_IDENT_PATTERN)
    dataset_id: str = Field(..., pattern=_IDENT_PATTERN)
    chart_type: Literal["bar", "line", "scatter", "pie"] = "bar"
    x_field: str = Field(..., pattern=_IDENT_PATTERN)
    y_field: str = Field(..., pattern=_IDENT_PATTERN)
    group_by: str | None = Field(default=None, pattern=_IDENT_PATTERN)
    aggregation: Literal["sum", "avg", "count", "min", "max"] = "sum"
    title: str = Field(default="", max_length=120)
    # react-grid-layout uses {x, y, w, h} for grid positioning
    x: int = Field(default=0, ge=0)
    y: int = Field(default=0, ge=0)
    w: int = Field(default=6, ge=1, le=12)
    h: int = Field(default=4, ge=1, le=24)


class DashboardCreate(BaseModel):
    name: str = Field(..., pattern=_IDENT_PATTERN, max_length=120)
    description: str = Field(default="", max_length=500)
    charts: list[ChartItem] = Field(default_factory=list)


class Dashboard(BaseModel):
    """A saved dashboard with its short share-link id."""

    id: str = Field(..., pattern=SHORT_ID_PATTERN)
    name: str
    description: str
    charts: list[ChartItem]
    created_at: str  # ISO timestamp from SQLite
    updated_at: str


class DashboardListItem(BaseModel):
    """Lightweight list view (no chart bodies) for index endpoints."""

    id: str = Field(..., pattern=SHORT_ID_PATTERN)
    name: str
    description: str
    chart_count: int
    updated_at: str
