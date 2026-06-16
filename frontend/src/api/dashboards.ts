/**
 * Dashboard API functions. Mirror backend Pydantic camelCase contract.
 */
import { api } from './client';
import type { Dashboard, DashboardCreate, DashboardListItem } from '../types/dashboard';

export async function listDashboards(): Promise<DashboardListItem[]> {
  return api.get<DashboardListItem[]>('/dashboards');
}

export async function getDashboard(id: string): Promise<Dashboard> {
  return api.get<Dashboard>(`/dashboards/${encodeURIComponent(id)}`);
}

export async function createDashboard(spec: DashboardCreate): Promise<Dashboard> {
  return api.post<Dashboard>('/dashboards', spec);
}

export async function updateDashboard(
  id: string,
  spec: DashboardCreate,
): Promise<Dashboard> {
  return api.put<Dashboard>(`/dashboards/${encodeURIComponent(id)}`, spec);
}

export async function deleteDashboard(id: string): Promise<void> {
  await api.delete<void>(`/dashboards/${encodeURIComponent(id)}`);
}
