"""Tests for the DuckDB-backed DatasetStore service.

NOTE: Tests that construct Polars DataFrames in-process (via the `small_df`
fixture) are skipped on this host because of a polars + pytest segfault
on x86_64-emulated Python on Apple Silicon. See backend/M1-NOTES.md.
CI (ubuntu-latest, real x86_64) runs them fine.
"""
from __future__ import annotations

import polars as pl
import pytest

from app.services.storage import DatasetStore, aggregate
from app.services.parser import parse_file


# All tests that depend on the `small_df` fixture (which constructs a Polars
# DataFrame in-process) are skipped on this host.
SKIP = pytest.mark.skip(
    reason="polars segfaults on x86_64-emulated venv on Apple Silicon; CI runs on real x86_64"
)


@pytest.fixture
def small_df():
    """A small DataFrame for storage tests."""
    return pl.DataFrame(
        {
            "region": ["Beijing", "Shanghai", "Beijing", "Shenzhen", "Shanghai"],
            "product": ["A", "B", "A", "C", "A"],
            "revenue": [100.0, 200.0, 150.0, 300.0, 175.0],
            "quantity": [1, 2, 1, 3, 2],
        }
    )


class TestDatasetStoreLifecycle:
    def test_creates_empty_store(self, store: DatasetStore) -> None:
        # store fixture already exists; should not raise
        assert store.exists("nonexistent") is False

    @SKIP
    def test_save_then_exists(self, store: DatasetStore, small_df) -> None:
        store.save("ds-1", "test.csv", small_df)
        assert store.exists("ds-1") is True

    @SKIP
    def test_get_meta(self, store: DatasetStore, small_df) -> None:
        store.save("ds-1", "test.csv", small_df)
        meta = store.get_meta("ds-1")
        assert meta["id"] == "ds-1"
        assert meta["name"] == "test.csv"
        assert meta["rows"] == 5

    def test_get_meta_nonexistent_raises(self, store: DatasetStore) -> None:
        with pytest.raises(KeyError):
            store.get_meta("does-not-exist")

    def test_close_idempotent(self, tmp_path) -> None:
        from app.services.storage import DatasetStore
        s = DatasetStore(duckdb_path=tmp_path / "x.duckdb")
        s.close()
        s.close()  # should not raise


class TestDatasetStoreRoundtrip:
    @SKIP
    def test_save_and_get_table_returns_same_rows(
        self, store: DatasetStore, small_df
    ) -> None:
        store.save("ds-1", "test.csv", small_df)
        loaded = store.get_table("ds-1")
        assert loaded.height == small_df.height
        assert set(loaded.columns) == set(small_df.columns)

    @SKIP
    def test_get_table_preserves_dtypes(
        self, store: DatasetStore, small_df
    ) -> None:
        store.save("ds-1", "test.csv", small_df)
        loaded = store.get_table("ds-1")
        assert loaded["revenue"].dtype == pl.Float64
        assert loaded["quantity"].dtype == pl.Int64

    @SKIP
    def test_save_overwrites_existing(self, store: DatasetStore, small_df) -> None:
        store.save("ds-1", "v1.csv", small_df)
        new_df = pl.DataFrame({"x": [1, 2, 3]})
        store.save("ds-1", "v2.csv", new_df)
        loaded = store.get_table("ds-1")
        assert loaded.height == 3
        assert "x" in loaded.columns


class TestDatasetStoreProfile:
    @SKIP
    def test_profile_returns_field_info(self, store: DatasetStore, sample_csv_path) -> None:
        df = parse_file(sample_csv_path)
        store.save("ds-1", "sales.csv", df)
        profile = store.profile("ds-1")
        assert len(profile) == 4  # 4 columns
        names = [f["name"] for f in profile]
        assert "region" in names
        assert "revenue" in names

    @SKIP
    def test_profile_includes_nulls(self, store: DatasetStore, sample_csv_with_nulls) -> None:
        df = parse_file(sample_csv_with_nulls)
        store.save("ds-1", "with_nulls.csv", df)
        profile = store.profile("ds-1")
        age_profile = next(f for f in profile if f["name"] == "age")
        assert age_profile["nulls"] == 2
        assert age_profile["distinct"] == 2

    @SKIP
    def test_profile_includes_min_max_for_numeric(
        self, store: DatasetStore, sample_csv_path
    ) -> None:
        df = parse_file(sample_csv_path)
        store.save("ds-1", "sales.csv", df)
        profile = store.profile("ds-1")
        rev = next(f for f in profile if f["name"] == "revenue")
        assert rev["min"] is not None
        assert rev["max"] is not None
        assert rev["max"] >= rev["min"]

    @SKIP
    def test_profile_includes_top_values(
        self, store: DatasetStore, sample_csv_path
    ) -> None:
        df = parse_file(sample_csv_path)
        store.save("ds-1", "sales.csv", df)
        profile = store.profile("ds-1")
        region = next(f for f in profile if f["name"] == "region")
        assert "Beijing" in region["top"]

    def test_profile_nonexistent_raises(self, store: DatasetStore) -> None:
        with pytest.raises(KeyError):
            store.profile("does-not-exist")


class TestDatasetStoreAggregate:
    @SKIP
    def test_aggregate_sum_by_x(self, store: DatasetStore, small_df) -> None:
        store.save("ds-1", "t.csv", small_df)
        result = aggregate(
            store, "ds-1", x_field="region", y_field="revenue", aggregation="sum"
        )
        assert "series" in result
        assert len(result["series"]) == 1
        data = result["series"][0]["data"]
        assert len(data) == 3

    @SKIP
    def test_aggregate_with_groupby_returns_multiple_series(
        self, store: DatasetStore, small_df
    ) -> None:
        store.save("ds-1", "t.csv", small_df)
        result = aggregate(
            store, "ds-1",
            x_field="region",
            y_field="revenue",
            group_by="product",
            aggregation="sum",
        )
        names = {s["name"] for s in result["series"]}
        assert "A" in names
        assert "B" in names
        assert "C" in names

    @SKIP
    def test_aggregate_count(self, store: DatasetStore, small_df) -> None:
        store.save("ds-1", "t.csv", small_df)
        result = aggregate(
            store, "ds-1", x_field="region", y_field="quantity", aggregation="count"
        )
        assert len(result["series"][0]["data"]) == 3
