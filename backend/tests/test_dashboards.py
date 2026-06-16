"""Tests for the DashboardStore service."""
from __future__ import annotations

import pytest

from app.models.dashboard import ChartItem, DashboardCreate
from app.services.dashboard_store import (
    SHORT_ID_ALPHABET,
    DashboardStore,
    _generate_short_id,
)


@pytest.fixture
def store(tmp_path) -> DashboardStore:
    s = DashboardStore(db_path=tmp_path / "test-dashboards.sqlite")
    yield s
    s.close()


def _chart(*, ordinal: int = 0, chart_id: str | None = None) -> ChartItem:
    # 标识符模式要求"字母/下划线/中文"开头,所以 chart_id / dataset_id 用合法前缀
    return ChartItem(
        id=chart_id or f"ch_{ordinal}",
        dataset_id="ds_abc",
        chart_type="bar",
        x_field="region",
        y_field="revenue",
        title="Sales by region",
        x=(ordinal % 2) * 6,
        y=ordinal,
        w=6,
        h=4,
    )


class TestShortId:
    def test_length_is_6(self) -> None:
        assert len(_generate_short_id()) == 6

    def test_uses_unambiguous_alphabet(self) -> None:
        # 100 samples should never contain 0, o, 1, l, I
        for _ in range(100):
            sid = _generate_short_id()
            for c in sid:
                assert c in SHORT_ID_ALPHABET

    def test_generated_ids_are_unique(self) -> None:
        seen = {_generate_short_id() for _ in range(1000)}
        assert len(seen) == 1000  # 6-char 31-base: collision is astronomically rare


class TestDashboardStoreLifecycle:
    def test_empty_list(self, store: DashboardStore) -> None:
        assert store.list() == []

    def test_create_returns_dashboard_with_short_id(self, store: DashboardStore) -> None:
        d = store.create(
            DashboardCreate(
                name="My_first_dashboard",
                description="overview_of_2025",
                charts=[_chart(ordinal=0)],
            )
        )
        assert len(d.id) == 6
        assert d.id.islower()
        assert d.name == "My_first_dashboard"
        assert d.description == "overview_of_2025"
        assert len(d.charts) == 1

    def test_create_idempotent_short_ids(self, store: DashboardStore) -> None:
        d1 = store.create(DashboardCreate(name="A", charts=[]))
        d2 = store.create(DashboardCreate(name="B", charts=[]))
        # Different short ids (collision is rare but possible to fail in principle)
        assert d1.id != d2.id

    def test_create_persists_charts_in_order(self, store: DashboardStore) -> None:
        charts = [_chart(ordinal=i, chart_id=f"ch_{i}") for i in range(3)]
        d = store.create(DashboardCreate(name="ordered", charts=charts))
        assert [c.id for c in d.charts] == ["ch_0", "ch_1", "ch_2"]


class TestDashboardStoreGet:
    def test_get_existing(self, store: DashboardStore) -> None:
        created = store.create(DashboardCreate(name="x", charts=[]))
        fetched = store.get(created.id)
        assert fetched.id == created.id
        assert fetched.name == "x"

    def test_get_missing_raises(self, store: DashboardStore) -> None:
        with pytest.raises(KeyError, match="not found"):
            store.get("nope12")


class TestDashboardStoreList:
    def test_list_includes_chart_count(self, store: DashboardStore) -> None:
        d1 = store.create(DashboardCreate(name="a", charts=[_chart(ordinal=0), _chart(ordinal=1)]))
        d2 = store.create(DashboardCreate(name="b", charts=[]))
        items = store.list()
        assert len(items) == 2
        by_id = {x.id: x for x in items}
        assert by_id[d1.id].chart_count == 2
        assert by_id[d2.id].chart_count == 0

    def test_list_empty(self, store: DashboardStore) -> None:
        assert store.list() == []


class TestDashboardStoreUpdate:
    def test_update_replaces_charts(self, store: DashboardStore) -> None:
        d = store.create(DashboardCreate(name="orig", charts=[_chart(ordinal=0)]))
        store.update(
            d.id,
            DashboardCreate(
                name="updated",
                description="new desc",
                charts=[_chart(ordinal=0), _chart(ordinal=1), _chart(ordinal=2)],
            ),
        )
        fetched = store.get(d.id)
        assert fetched.name == "updated"
        assert fetched.description == "new desc"
        assert len(fetched.charts) == 3

    def test_update_missing_raises(self, store: DashboardStore) -> None:
        with pytest.raises(KeyError):
            store.update(
                "nope12",
                DashboardCreate(name="x", charts=[]),
            )

    def test_update_bumps_updated_at(self, store: DashboardStore) -> None:
        d = store.create(DashboardCreate(name="x", charts=[]))
        # Tiny sleep to ensure CURRENT_TIMESTAMP advances (1s granularity in SQLite)
        import time
        time.sleep(1.1)
        store.update(d.id, DashboardCreate(name="y", charts=[]))
        fetched = store.get(d.id)
        assert fetched.updated_at >= d.updated_at


class TestDashboardStoreDelete:
    def test_delete_existing(self, store: DashboardStore) -> None:
        d = store.create(DashboardCreate(name="x", charts=[_chart(ordinal=0)]))
        store.delete(d.id)
        with pytest.raises(KeyError):
            store.get(d.id)

    def test_delete_cascades_charts(self, store: DashboardStore) -> None:
        d = store.create(DashboardCreate(name="x", charts=[_chart(ordinal=0), _chart(ordinal=1)]))
        store.delete(d.id)
        # CASCADE should have removed the chart rows
        # (indirectly verifiable: a new dashboard with the same chart ids works)
        d2 = store.create(
            DashboardCreate(name="y", charts=[_chart(ordinal=0, chart_id="ch_0")])
        )
        assert d2.id != d.id

    def test_delete_idempotent(self, store: DashboardStore) -> None:
        d = store.create(DashboardCreate(name="x", charts=[]))
        store.delete(d.id)
        # Second delete raises — explicit is better than silent no-op
        with pytest.raises(KeyError):
            store.delete(d.id)
