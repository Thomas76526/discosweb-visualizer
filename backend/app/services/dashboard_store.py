"""SQLite-backed dashboard store.

Kept separate from the DuckDB dataset store because:
- Datasets are columnar / analytical, dashboards are relational (charts ↔ datasets)
- Different access patterns (dashboards: small docs, JSON-friendly; datasets: huge tables)
- Different backup cadence (dashboards are user content, datasets may be ephemeral)

Lives at ``settings.dashboard_db_path`` (default: ``./data/runtime/dashboards.sqlite``)
which is mounted from the same ``db-data`` named volume as DuckDB.
"""
from __future__ import annotations

import secrets
import sqlite3
import threading
from pathlib import Path

from app.models.dashboard import (
    ChartItem,
    Dashboard,
    DashboardCreate,
    DashboardListItem,
    SHORT_ID_ALPHABET,
)


def _generate_short_id(n: int = 6) -> str:
    """Generate a random short id using the unambiguous alphabet.

    Cryptographically random (``secrets``), so it's not a sequential guessable
    attack surface even though it's only 6 chars.
    """
    return "".join(secrets.choice(SHORT_ID_ALPHABET) for _ in range(n))


class DashboardStore:
    """Thread-safe SQLite-backed dashboard store."""

    def __init__(self, db_path: str | Path = ":memory:") -> None:
        self.db_path = str(db_path)
        if self.db_path != ":memory:":
            Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        # check_same_thread=False because FastAPI may use a thread pool
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        # SQLite requires per-connection FK enforcement; default is OFF.
        # Without this, ON DELETE CASCADE is a no-op and child rows survive parent deletes.
        self.conn.execute("PRAGMA foreign_keys = ON")
        self._lock = threading.Lock()
        self._init_schema()

    def _init_schema(self) -> None:
        with self._lock:
            self.conn.execute(
                """
                CREATE TABLE IF NOT EXISTS dashboards (
                    id          TEXT PRIMARY KEY,
                    name        TEXT NOT NULL,
                    description TEXT NOT NULL DEFAULT '',
                    created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
                """
            )
            self.conn.execute(
                """
                CREATE TABLE IF NOT EXISTS dashboard_charts (
                    id           TEXT PRIMARY KEY,
                    dashboard_id TEXT NOT NULL,
                    dataset_id   TEXT NOT NULL,
                    chart_type   TEXT NOT NULL DEFAULT 'bar',
                    x_field      TEXT NOT NULL,
                    y_field      TEXT NOT NULL,
                    group_by     TEXT,
                    aggregation  TEXT NOT NULL DEFAULT 'sum',
                    title        TEXT NOT NULL DEFAULT '',
                    x            INTEGER NOT NULL DEFAULT 0,
                    y            INTEGER NOT NULL DEFAULT 0,
                    w            INTEGER NOT NULL DEFAULT 6,
                    h            INTEGER NOT NULL DEFAULT 4,
                    ordinal      INTEGER NOT NULL DEFAULT 0,
                    FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE
                )
                """
            )
            self.conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_dashboard_charts_dash "
                "ON dashboard_charts(dashboard_id, ordinal)"
            )
            self.conn.commit()

    def close(self) -> None:
        with self._lock:
            self.conn.close()

    # ---------------- CRUD ----------------

    def create(self, spec: DashboardCreate) -> Dashboard:
        with self._lock:
            dash_id = self._unique_id()
            self.conn.execute(
                "INSERT INTO dashboards (id, name, description) VALUES (?, ?, ?)",
                [dash_id, spec.name, spec.description],
            )
            for ordinal, ch in enumerate(spec.charts):
                self.conn.execute(
                    """
                    INSERT INTO dashboard_charts
                        (id, dashboard_id, dataset_id, chart_type,
                         x_field, y_field, group_by, aggregation, title,
                         x, y, w, h, ordinal)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    [
                        ch.id, dash_id, ch.dataset_id, ch.chart_type,
                        ch.x_field, ch.y_field, ch.group_by, ch.aggregation, ch.title,
                        ch.x, ch.y, ch.w, ch.h, ordinal,
                    ],
                )
            self.conn.commit()
        return self.get(dash_id)

    def get(self, dash_id: str) -> Dashboard:
        row = self.conn.execute(
            "SELECT id, name, description, created_at, updated_at "
            "FROM dashboards WHERE id = ?",
            [dash_id],
        ).fetchone()
        if row is None:
            raise KeyError(f"Dashboard not found: {dash_id}")
        charts = self._load_charts(dash_id)
        return Dashboard(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            charts=charts,
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def list(self) -> list[DashboardListItem]:
        rows = self.conn.execute(
            """
            SELECT d.id, d.name, d.description, d.updated_at,
                   COUNT(c.id) AS chart_count
            FROM dashboards d
            LEFT JOIN dashboard_charts c ON c.dashboard_id = d.id
            GROUP BY d.id
            ORDER BY d.updated_at DESC
            """
        ).fetchall()
        return [
            DashboardListItem(
                id=r["id"],
                name=r["name"],
                description=r["description"],
                chart_count=r["chart_count"],
                updated_at=r["updated_at"],
            )
            for r in rows
        ]

    def update(self, dash_id: str, spec: DashboardCreate) -> Dashboard:
        with self._lock:
            existing = self.conn.execute(
                "SELECT id FROM dashboards WHERE id = ?", [dash_id]
            ).fetchone()
            if existing is None:
                raise KeyError(f"Dashboard not found: {dash_id}")
            self.conn.execute(
                """
                UPDATE dashboards
                SET name = ?, description = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                [spec.name, spec.description, dash_id],
            )
            # Replace charts wholesale — simpler than diffing for M2
            self.conn.execute(
                "DELETE FROM dashboard_charts WHERE dashboard_id = ?", [dash_id]
            )
            for ordinal, ch in enumerate(spec.charts):
                self.conn.execute(
                    """
                    INSERT INTO dashboard_charts
                        (id, dashboard_id, dataset_id, chart_type,
                         x_field, y_field, group_by, aggregation, title,
                         x, y, w, h, ordinal)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    [
                        ch.id, dash_id, ch.dataset_id, ch.chart_type,
                        ch.x_field, ch.y_field, ch.group_by, ch.aggregation, ch.title,
                        ch.x, ch.y, ch.w, ch.h, ordinal,
                    ],
                )
            self.conn.commit()
        return self.get(dash_id)

    def delete(self, dash_id: str) -> None:
        with self._lock:
            # Check existence first — explicit is better than silent no-op
            existing = self.conn.execute(
                "SELECT 1 FROM dashboards WHERE id = ?", [dash_id]
            ).fetchone()
            if existing is None:
                raise KeyError(f"Dashboard not found: {dash_id}")
            self.conn.execute("DELETE FROM dashboards WHERE id = ?", [dash_id])
            self.conn.commit()

    # ---------------- internals ----------------

    def _load_charts(self, dash_id: str) -> list[ChartItem]:
        rows = self.conn.execute(
            """
            SELECT id, dataset_id, chart_type, x_field, y_field,
                   group_by, aggregation, title, x, y, w, h
            FROM dashboard_charts
            WHERE dashboard_id = ?
            ORDER BY ordinal, rowid
            """,
            [dash_id],
        ).fetchall()
        return [
            ChartItem(
                id=r["id"],
                dataset_id=r["dataset_id"],
                chart_type=r["chart_type"],
                x_field=r["x_field"],
                y_field=r["y_field"],
                group_by=r["group_by"],
                aggregation=r["aggregation"],
                title=r["title"],
                x=r["x"],
                y=r["y"],
                w=r["w"],
                h=r["h"],
            )
            for r in rows
        ]

    def _unique_id(self) -> str:
        """Generate a short id; retry on the astronomically unlikely collision."""
        for _ in range(8):
            sid = _generate_short_id()
            existing = self.conn.execute(
                "SELECT 1 FROM dashboards WHERE id = ?", [sid]
            ).fetchone()
            if existing is None:
                return sid
        raise RuntimeError("Could not generate unique short id after 8 attempts")
