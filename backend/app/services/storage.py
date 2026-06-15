"""DuckDB-backed dataset store.

Each dataset is persisted as its own DuckDB table (`data_<id>`).
Metadata is tracked in two internal tables (`_datasets`, `_dataset_tables`)
to keep the API for "find dataset" / "get field profile" / "aggregate" simple.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import duckdb
import polars as pl

# DuckDB SQL identifiers can contain letters/digits/underscore, but we sanitize
# all user-supplied strings (dataset ids, field names) to this safe set.
_SAFE_IDENT = re.compile(r"[^A-Za-z0-9_]")

# H-10 修复:前置过滤 NULL / 控制字符,避免流向 DuckDB 标识符解析器
_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")


def _safe_ident(s: str) -> str:
    """Sanitize a string for use as a SQL identifier (table or column name)."""
    cleaned = _SAFE_IDENT.sub("_", s)
    if not cleaned or not (cleaned[0].isalpha() or cleaned[0] == "_"):
        cleaned = "t_" + cleaned
    return cleaned


def _quote(s: str) -> str:
    """Wrap an identifier in double quotes for safe SQL composition.

    Raises:
        ValueError: if `s` contains control characters (NULL, newlines, etc.)
            that could confuse the SQL parser or downstream tooling.
    """
    if _CONTROL_CHARS.search(s):
        raise ValueError(
            f"Identifier contains control characters (rejected): {s!r}"
        )
    return '"' + s.replace('"', '""') + '"'


class DatasetStore:
    """In-process DuckDB connection that manages dataset tables and metadata."""

    def __init__(self, duckdb_path: str | Path = ":memory:") -> None:
        self.duckdb_path = str(duckdb_path)
        # Ensure parent dir exists for file-backed DBs
        if self.duckdb_path != ":memory:":
            Path(self.duckdb_path).parent.mkdir(parents=True, exist_ok=True)
        self.conn = duckdb.connect(self.duckdb_path)
        self._init_schema()

    def _init_schema(self) -> None:
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS _datasets (
                id          VARCHAR PRIMARY KEY,
                name        VARCHAR NOT NULL,
                rows        INTEGER NOT NULL,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        self.conn.execute(
            """
            CREATE TABLE IF NOT EXISTS _dataset_tables (
                dataset_id  VARCHAR PRIMARY KEY,
                table_name  VARCHAR NOT NULL
            )
            """
        )

    def close(self) -> None:
        if self.conn is not None:
            self.conn.close()
            self.conn = None  # type: ignore[assignment]

    # ---------------- dataset lifecycle ----------------

    def save(self, dataset_id: str, name: str, df: pl.DataFrame) -> None:
        """Persist a Polars DataFrame as a new (or replacement) dataset."""
        table_name = f"data_{_safe_ident(dataset_id)}"

        # Use Arrow as the interop format (no pandas dependency).
        # Polars → Arrow is zero-copy for primitive types.
        arrow_table = df.to_arrow()
        self.conn.register("__polars_view", arrow_table)
        try:
            self.conn.execute(
                f"CREATE OR REPLACE TABLE {_quote(table_name)} AS SELECT * FROM __polars_view"
            )
        finally:
            self.conn.unregister("__polars_view")

        # Upsert into metadata tables
        self.conn.execute(
            "INSERT OR REPLACE INTO _dataset_tables (dataset_id, table_name) VALUES (?, ?)",
            [dataset_id, table_name],
        )
        # Use MERGE for datasets table (DuckDB supports it)
        self.conn.execute(
            """
            MERGE INTO _datasets t
            USING (SELECT ? AS id, ? AS name, ? AS rows) s
            ON t.id = s.id
            WHEN MATCHED THEN UPDATE SET name = s.name, rows = s.rows
            WHEN NOT MATCHED THEN INSERT (id, name, rows) VALUES (s.id, s.name, s.rows)
            """,
            [dataset_id, name, df.height],
        )

    def exists(self, dataset_id: str) -> bool:
        row = self.conn.execute(
            "SELECT 1 FROM _datasets WHERE id = ?", [dataset_id]
        ).fetchone()
        return row is not None

    def get_meta(self, dataset_id: str) -> dict[str, Any]:
        row = self.conn.execute(
            "SELECT id, name, rows FROM _datasets WHERE id = ?", [dataset_id]
        ).fetchone()
        if row is None:
            raise KeyError(f"Dataset not found: {dataset_id}")
        return {"id": row[0], "name": row[1], "rows": row[2]}

    def get_table(self, dataset_id: str) -> pl.DataFrame:
        table_name = self.get_table_name(dataset_id)
        arrow_table = self.conn.execute(
            f"SELECT * FROM {_quote(table_name)}"
        ).arrow()
        # pl.from_arrow may return DataFrame | Series; assert it's a DataFrame
        result = pl.from_arrow(arrow_table)
        if not isinstance(result, pl.DataFrame):
            # Defensive: a single-column SELECT * shouldn't happen, but guard
            raise TypeError(f"Expected DataFrame, got {type(result).__name__}")
        return result

    def head(self, dataset_id: str, n: int = 5) -> pl.DataFrame:
        """Return the first `n` rows of the dataset (MED-3: avoid full table scan).

        Uses `LIMIT n` so 50MB uploads don't get fully loaded just to display
        a 5-row sample in the API response.
        """
        if n < 0:
            raise ValueError(f"n must be non-negative, got {n}")
        table_name = self.get_table_name(dataset_id)
        arrow_table = self.conn.execute(
            f"SELECT * FROM {_quote(table_name)} LIMIT {int(n)}"
        ).arrow()
        result = pl.from_arrow(arrow_table)
        if not isinstance(result, pl.DataFrame):
            raise TypeError(f"Expected DataFrame, got {type(result).__name__}")
        return result

    # ---------------- profile ----------------

    def profile(self, dataset_id: str) -> list[dict[str, Any]]:
        """Compute per-field statistics.

        HIGH-3 修复:从 1+5N queries 降到 1+2N queries:
          - 1 × DESCRIBE (column metadata)
          - 1 × conditional-aggregate SELECT per column (nulls, distinct, min, max)
          - 1 × top-5 SELECT per column (separate because GROUP BY can't be folded in)
        """
        table_name = self.get_table_name(dataset_id)
        col_info = self.conn.execute(f"DESCRIBE {_quote(table_name)}").fetchall()
        # DESCRIBE returns: column_name, column_type, null, key, default, extra
        result: list[dict[str, Any]] = []
        for name, dtype, *_ in col_info:
            safe = _quote(name)
            # One SELECT with conditional aggregates for nulls/distinct/min/max
            stats_row = self.conn.execute(
                f"""
                SELECT
                  COUNT(*) - COUNT({safe})                AS nulls,
                  COUNT(DISTINCT {safe})                  AS distinct,
                  MIN({safe})                             AS min_v,
                  MAX({safe})                             AS max_v
                FROM {_quote(table_name)}
                """
            ).fetchone()
            # DuckDB fetchone() can return None for empty tables;
            # coerce to a 4-tuple of zeros/None in that case.
            if stats_row is None:
                nulls, distinct, min_v, max_v = 0, 0, None, None
            else:
                nulls, distinct, min_v, max_v = stats_row

            entry: dict[str, Any] = {
                "name": name,
                "type": dtype,
                "nulls": nulls,
                "distinct": distinct,
                "min": min_v,
                "max": max_v,
                "top": [],
            }

            # Top 5 most common values (separate query — can't be folded)
            top_rows = self.conn.execute(
                f"""
                SELECT {safe} AS v, COUNT(*) AS c
                FROM {_quote(table_name)}
                GROUP BY {safe}
                ORDER BY c DESC, v ASC
                LIMIT 5
                """
            ).fetchall()
            entry["top"] = [v[0] for v in top_rows]

            result.append(entry)
        return result

    # ---------------- internals ----------------

    def get_table_name(self, dataset_id: str) -> str:
        """Return the underlying DuckDB table name for a dataset.

        HIGH-2 修复:public 方法,1 个 round-trip,raise KeyError if missing。
        取代之前的 _table_name 私有方法(那个做 2 次查询:exists + 查表名)。
        """
        row = self.conn.execute(
            "SELECT table_name FROM _dataset_tables WHERE dataset_id = ?",
            [dataset_id],
        ).fetchone()
        if row is None:
            raise KeyError(f"Dataset not found: {dataset_id}")
        return row[0]


# ---------------- standalone aggregation ----------------


def aggregate(
    store: DatasetStore,
    dataset_id: str,
    *,
    x_field: str,
    y_field: str,
    aggregation: str = "sum",
    group_by: str | None = None,
) -> dict[str, Any]:
    """Aggregate data for chart preview.

    Returns:
        {
          "series": [
              {"name": str, "data": [[x, y], ...]},
              ...
          ]
        }
    """
    if not store.exists(dataset_id):
        raise KeyError(f"Dataset not found: {dataset_id}")

    # HIGH-2 修复:直接用 public get_table_name (单 round-trip),
    # 之前的实现走了 exists() + _table_name() = 2 queries
    table_name = store.get_table_name(dataset_id)
    agg_fn = {
        "sum": "SUM",
        "avg": "AVG",
        "count": "COUNT",
        "min": "MIN",
        "max": "MAX",
    }.get(aggregation, "SUM")
    if agg_fn == "COUNT":
        # COUNT can take any field; others use the y_field
        y_expr = "1"
    else:
        y_expr = f"{agg_fn}({_quote(y_field)})"

    if group_by:
        sql = f"""
            SELECT {_quote(group_by)} AS g,
                   {_quote(x_field)} AS x,
                   {y_expr} AS y
            FROM {_quote(table_name)}
            GROUP BY {_quote(group_by)}, {_quote(x_field)}
            ORDER BY {_quote(x_field)}
        """
        rows = store.conn.execute(sql).fetchall()
        groups: dict[str, list[list[Any]]] = {}
        for g, x, y in rows:
            groups.setdefault(str(g), []).append([x, float(y)])
        return {
            "series": [
                {"name": name, "data": data} for name, data in groups.items()
            ]
        }
    else:
        sql = f"""
            SELECT {_quote(x_field)} AS x, {y_expr} AS y
            FROM {_quote(table_name)}
            GROUP BY {_quote(x_field)}
            ORDER BY {_quote(x_field)}
        """
        rows = store.conn.execute(sql).fetchall()
        return {
            "series": [
                {
                    "name": y_field,
                    "data": [[r[0], float(r[1])] for r in rows],
                }
            ]
        }
