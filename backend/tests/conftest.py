"""Shared test fixtures for backend tests."""
from __future__ import annotations

from pathlib import Path
from typing import Iterator

import pytest

from app.services.storage import DatasetStore


@pytest.fixture
def sample_csv_path(tmp_path: Path) -> Path:
    """Create a small CSV file for testing."""
    p = tmp_path / "sales.csv"
    p.write_text(
        "date,region,revenue,quantity\n"
        "2025-01-01,Beijing,1500.00,3\n"
        "2025-01-02,Shanghai,2300.50,5\n"
        "2025-01-03,Beijing,890.00,2\n"
        "2025-01-04,Shenzhen,3200.75,8\n"
        "2025-01-05,Shanghai,1750.25,4\n",
        encoding="utf-8",
    )
    return p


@pytest.fixture
def sample_json_path(tmp_path: Path) -> Path:
    """Create a small JSON file for testing (array of objects)."""
    p = tmp_path / "products.json"
    p.write_text(
        '[{"id": "P001", "category": "electronics", "price": 999.0},'
        ' {"id": "P002", "category": "electronics", "price": 1299.0},'
        ' {"id": "P003", "category": "furniture", "price": 450.0}]',
        encoding="utf-8",
    )
    return p


@pytest.fixture
def sample_csv_with_nulls(tmp_path: Path) -> Path:
    """CSV with nulls to test profile stats.

    Nulls:  - age:    Bob, Diana        (2)
            - score:  Charlie, Diana    (2)
    Distinct age values: 30, 35  (Alice×2 + Charlie, so 2 distinct)
    """
    p = tmp_path / "with_nulls.csv"
    p.write_text(
        "name,age,score\n"
        "Alice,30,95.5\n"
        "Bob,,87.0\n"
        "Charlie,35,\n"
        "Alice,30,95.5\n"
        "Diana,,\n",
        encoding="utf-8",
    )
    return p


@pytest.fixture
def oversized_file(tmp_path: Path) -> Path:
    """A file larger than the upload limit (we'll test the limit check)."""
    p = tmp_path / "huge.csv"
    # ~2MB of CSV; MAX_UPLOAD_MB default in tests is 1
    p.write_text("a,b\n" + "x,y\n" * 200_000, encoding="utf-8")
    return p


@pytest.fixture
def unsafe_filename() -> str:
    """Filename that tries path traversal."""
    return "../../../etc/passwd"


@pytest.fixture
def store(tmp_path: Path) -> Iterator[DatasetStore]:
    """In-memory DuckDB-backed DatasetStore for fast tests."""
    s = DatasetStore(duckdb_path=tmp_path / "test.duckdb")
    yield s
    s.close()
