import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ChartItem, Dashboard, DashboardListItem } from '../types/dashboard';

export interface DashboardState {
  /** List of all dashboards (lightweight) for the index view. */
  list: DashboardListItem[];
  /** Currently loaded dashboard (with full chart bodies) or null. */
  current: Dashboard | null;
  /** True while any dashboard op is in flight. */
  isLoading: boolean;
  error: string | null;

  setList: (items: DashboardListItem[]) => void;
  setCurrent: (d: Dashboard | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  /** Update one chart in the current dashboard (used after grid drag). */
  updateChartInCurrent: (chartId: string, patch: Partial<ChartItem>) => void;
  /** Add a new chart to the current dashboard. */
  addChartToCurrent: (chart: ChartItem) => void;
  /** Remove a chart by id from the current dashboard. */
  removeChartFromCurrent: (chartId: string) => void;
  reset: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set) => ({
      list: [],
      current: null,
      isLoading: false,
      error: null,

      setList: (list) => set({ list }),
      setCurrent: (current) => set({ current, error: null }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      updateChartInCurrent: (chartId, patch) =>
        set((s) =>
          s.current === null
            ? s
            : {
                current: {
                  ...s.current,
                  charts: s.current.charts.map((c) =>
                    c.id === chartId ? { ...c, ...patch } : c,
                  ),
                },
              },
        ),
      addChartToCurrent: (chart) =>
        set((s) =>
          s.current === null
            ? s
            : { current: { ...s.current, charts: [...s.current.charts, chart] } },
        ),
      removeChartFromCurrent: (chartId) =>
        set((s) =>
          s.current === null
            ? s
            : {
                current: {
                  ...s.current,
                  charts: s.current.charts.filter((c) => c.id !== chartId),
                },
              },
        ),
      reset: () =>
        set({ list: [], current: null, isLoading: false, error: null }),
    }),
    { name: 'discosweb-dashboard' },
  ),
);
