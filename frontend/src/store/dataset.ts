import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ChartPreview, ChartType, DatasetMeta, FieldProfile } from '../types/api';

export interface DatasetState {
  /** Current dataset metadata, null when none loaded. */
  current: DatasetMeta | null;
  /** Per-field statistics, loaded lazily after upload. */
  profile: FieldProfile[] | null;
  /** Last computed chart preview (or null). */
  chartPreview: ChartPreview | null;
  /**
   * User-selected chart type for the next preview render. Lives in the store
   * (not local state in ChartConfigPanel) so the renderer in App can dispatch
   * on it without prop drilling.
   */
  chartType: ChartType;
  /** True while a dataset request is in flight. */
  isLoading: boolean;
  /** Error message for the last failed operation, or null. */
  error: string | null;

  setCurrent: (ds: DatasetMeta) => void;
  setProfile: (profile: FieldProfile[]) => void;
  setChartPreview: (preview: ChartPreview | null) => void;
  setChartType: (chartType: ChartType) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useDatasetStore = create<DatasetState>()(
  devtools(
    (set) => ({
      current: null,
      profile: null,
      chartPreview: null,
      // CRITICAL-1 修复:bar 是 M1 默认支持的类型;
      // pie/scatter 工厂函数已实现但 frontend 还没接 ScatterChart/PieChart 组件,
      // 所以 chartType 仍可在 dropdown 中表示(memory 中),
      // 但 ChartConfigPanel 把不实现的选项在 UI 上隐藏。
      chartType: 'bar',
      isLoading: false,
      error: null,

      setCurrent: (ds) => set({ current: ds, error: null }),
      setProfile: (profile) => set({ profile }),
      setChartPreview: (preview) => set({ chartPreview: preview }),
      setChartType: (chartType) => set({ chartType }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      reset: () =>
        set({
          current: null,
          profile: null,
          chartPreview: null,
          isLoading: false,
          error: null,
        }),
    }),
    { name: 'discosweb-dataset' },
  ),
);
