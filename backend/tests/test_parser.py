"""Tests for the file parser service."""
from __future__ import annotations

from pathlib import Path

import polars as pl
import pytest

from app.services.parser import parse_file


class TestParseFile:
    def test_parses_csv_to_dataframe(self, sample_csv_path: Path) -> None:
        df = parse_file(sample_csv_path)

        assert isinstance(df, pl.DataFrame)
        assert df.height == 5  # 5 data rows
        assert df.columns == ["date", "region", "revenue", "quantity"]

    def test_csv_column_dtypes_are_inferred(self, sample_csv_path: Path) -> None:
        df = parse_file(sample_csv_path)

        # numeric columns should be Float64 / Int64, not String
        assert df["revenue"].dtype in (pl.Float64, pl.Float32)
        assert df["quantity"].dtype in (pl.Int64, pl.Int32)

    def test_parses_json_to_dataframe(self, sample_json_path: Path) -> None:
        df = parse_file(sample_json_path)

        assert isinstance(df, pl.DataFrame)
        assert df.height == 3
        assert "id" in df.columns
        assert "category" in df.columns

    def test_csv_with_nulls_preserved(self, sample_csv_with_nulls: Path) -> None:
        df = parse_file(sample_csv_with_nulls)

        assert df.height == 5
        # 2 nulls in 'age' (Bob, Diana), 2 nulls in 'score' (Charlie, Diana)
        nulls_age = df["age"].null_count()
        nulls_score = df["score"].null_count()
        assert nulls_age == 2
        assert nulls_score == 2

    def test_unsupported_extension_raises(self, tmp_path: Path) -> None:
        p = tmp_path / "data.txt"
        p.write_text("not a real data file", encoding="utf-8")

        with pytest.raises(ValueError, match="[Uu]nsupported|[Ii]nvalid"):
            parse_file(p)

    def test_missing_file_raises(self, tmp_path: Path) -> None:
        p = tmp_path / "does_not_exist.csv"
        with pytest.raises(FileNotFoundError):
            parse_file(p)

    def test_empty_csv_raises(self, tmp_path: Path) -> None:
        p = tmp_path / "empty.csv"
        p.write_text("", encoding="utf-8")
        with pytest.raises(Exception):  # Polars raises ComputeError or similar
            parse_file(p)

    def test_case_insensitive_extension(self, tmp_path: Path) -> None:
        p = tmp_path / "DATA.CSV"
        p.write_text("a,b\n1,2\n", encoding="utf-8")
        df = parse_file(p)
        assert df.height == 1
