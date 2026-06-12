"""File parsing service.

Supports CSV, JSON (array-of-objects), and Parquet. Each format is parsed
into a Polars DataFrame, which is the canonical in-memory representation
we pass to the storage layer (DuckDB).
"""
from __future__ import annotations

from pathlib import Path

import polars as pl

# Allowed extensions are case-insensitive; we normalize via .lower()
_ALLOWED_EXTENSIONS: dict[str, str] = {
    ".csv": "csv",
    ".json": "json",
    ".jsonl": "ndjson",
    ".ndjson": "ndjson",
    ".parquet": "parquet",
    ".pq": "parquet",
}


def parse_file(path: str | Path) -> pl.DataFrame:
    """Parse a file based on its extension into a Polars DataFrame.

    Raises:
        FileNotFoundError: path does not exist
        ValueError: unsupported extension
        polars.exceptions.ComputeError: file exists but cannot be parsed
            (malformed CSV, invalid JSON, etc.)
    """
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"File not found: {p}")

    ext = p.suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type: '{ext}'. "
            f"Allowed: {sorted(set(_ALLOWED_EXTENSIONS.keys()))}"
        )

    fmt = _ALLOWED_EXTENSIONS[ext]
    if fmt == "csv":
        return pl.read_csv(p, infer_schema_length=1000)
    elif fmt == "json":
        return _read_json(p)
    elif fmt == "ndjson":
        return pl.read_ndjson(p)
    elif fmt == "parquet":
        return pl.read_parquet(p)
    else:  # pragma: no cover — defensive
        raise ValueError(f"Unhandled format: {fmt}")


def _read_json(p: Path) -> pl.DataFrame:
    """Read a JSON file that may be an array of objects or NDJSON.

    Polars's read_json expects a JSON array; if the file is line-delimited
    JSON (one object per line) we fall back to read_ndjson.
    """
    # Sniff first non-whitespace char to decide
    with p.open("rb") as f:
        head = f.read(64).lstrip()
    if head.startswith(b"["):
        return pl.read_json(p)
    elif head.startswith(b"{"):
        return pl.read_ndjson(p)
    else:
        # Try read_json anyway and let Polars raise a meaningful error
        return pl.read_json(p)


def allowed_extensions() -> set[str]:
    """Return the set of file extensions this parser supports."""
    return set(_ALLOWED_EXTENSIONS.keys())
