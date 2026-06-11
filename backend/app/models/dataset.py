"""Pydantic models for datasets, fields, and chart specifications."""
from typing import Any, Literal

from pydantic import BaseModel, Field


class FieldInfo(BaseModel):
    name: str
    type: str


class DatasetMeta(BaseModel):
    id: str
    name: str
    rows: int
    fields: list[FieldInfo]
    sample: list[dict[str, Any]] = Field(default_factory=list)


class FieldProfile(FieldInfo):
    nulls: int = 0
    distinct: int = 0
    min: Any | None = None
    max: Any | None = None
    top: list[Any] = Field(default_factory=list)


class DatasetProfile(BaseModel):
    fields: list[FieldProfile]


class ChartSpec(BaseModel):
    dataset_id: str = Field(alias="datasetId")
    chart_type: Literal["bar", "line", "scatter", "pie"] = Field(alias="chartType")
    x_field: str = Field(alias="xField")
    y_field: str = Field(alias="yField")
    group_by: str | None = Field(default=None, alias="groupBy")
    aggregation: Literal["sum", "avg", "count", "min", "max"] | None = None


class ChartSeries(BaseModel):
    name: str
    data: list[list[Any]]


class ChartPreview(BaseModel):
    series: list[ChartSeries]
