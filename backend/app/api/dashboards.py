"""Dashboard CRUD endpoints."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.models.dashboard import Dashboard, DashboardCreate, DashboardListItem
from app.services.dashboard_store import DashboardStore

router = APIRouter()


def _get_store(request: Request) -> DashboardStore:
    store: DashboardStore | None = getattr(request.app.state, "dashboard_store", None)
    if store is None:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Dashboard store not initialized",
        )
    return store


@router.get("", response_model=list[DashboardListItem])
async def list_dashboards(
    store: Annotated[DashboardStore, Depends(_get_store)],
) -> list[DashboardListItem]:
    """List all dashboards (lightweight, no chart bodies)."""
    return store.list()


@router.post("", response_model=Dashboard, status_code=status.HTTP_201_CREATED)
async def create_dashboard(
    spec: DashboardCreate,
    store: Annotated[DashboardStore, Depends(_get_store)],
) -> Dashboard:
    """Create a new dashboard, returns it with a generated short id."""
    return store.create(spec)


@router.get("/{dash_id}", response_model=Dashboard)
async def get_dashboard(
    dash_id: str,
    store: Annotated[DashboardStore, Depends(_get_store)],
) -> Dashboard:
    """Fetch a dashboard by its short id (the share-link id)."""
    try:
        return store.get(dash_id)
    except KeyError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))


@router.put("/{dash_id}", response_model=Dashboard)
async def update_dashboard(
    dash_id: str,
    spec: DashboardCreate,
    store: Annotated[DashboardStore, Depends(_get_store)],
) -> Dashboard:
    """Update an existing dashboard (wholesale chart replace)."""
    try:
        return store.update(dash_id, spec)
    except KeyError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(e))


@router.delete("/{dash_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dashboard(
    dash_id: str,
    store: Annotated[DashboardStore, Depends(_get_store)],
) -> None:
    """Delete a dashboard (and its charts via CASCADE)."""
    store.delete(dash_id)
