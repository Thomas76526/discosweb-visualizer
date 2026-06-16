"""Pydantic models for datasets, fields, and chart specifications."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

# H-08/H-09 修复:user-supplied identifier (列名 / dataset id / 看板 id) 的字面约束。
# 允许 ASCII 字母数字下划线 + 中文 (中文表头是真实业务需求) + dot(用于嵌套字段),
# 长度 1-64,首字符必须是字母/下划线/中文(避免以数字开头的标识符)。
_IDENT_PATTERN = r"^[A-Za-z_一-鿿][A-Za-z0-9_一-鿿.]{0,63}$"

# Dataset / Dashboard 的 name 是用户提供的展示名 (可能含空格、中文、横线等),
# 不能套 identifier 约束,只做长度 + 基础安全限制:
#   - 长度 1-255
#   - 拒 NULL / 控制字符
_NAME_PATTERN = r"^[\x20-\x7e　-鿿一-鿿]{1,255}$"


class FieldInfo(BaseModel):
    name: str = Field(..., pattern=_IDENT_PATTERN)
    type: str


class DatasetMeta(BaseModel):
    id: str
    # name 是用户文件/数据集展示名("sample-sales-2025.csv"),不是 SQL identifier,
    # 套 _NAME_PATTERN (允许空格 / 中文 / - / .),长度 1-255
    name: str = Field(..., pattern=_NAME_PATTERN)
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
    # H-08/H-09 修复:user-supplied 字段名必须匹配 identifier pattern,
    # 否则 422 拒绝。这层校验 + _quote 的引号转义 = 双层防御。
    x_field: str = Field(..., alias="xField", pattern=_IDENT_PATTERN)
    y_field: str = Field(..., alias="yField", pattern=_IDENT_PATTERN)
    group_by: str | None = Field(default=None, alias="groupBy", pattern=_IDENT_PATTERN)
    aggregation: Literal["sum", "avg", "count", "min", "max"] = "sum"


class ChartSeries(BaseModel):
    name: str
    data: list[list[Any]]


class ChartPreview(BaseModel):
    series: list[ChartSeries]
