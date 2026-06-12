import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ChartPreview, DatasetMeta, FieldProfile } from '../types/api';

export interface DatasetState {
  /** Current dataset metadata, null when none loaded. */
  current: DatasetMeta | null;
  /** Per-field statistics, loaded lazily after upload. */
  profile: FieldProfile[] | null;
  /** Last computed chart preview (or null). */
  chartPreview: ChartPreview | null;
  /** True while a dataset request is in flight. */
  isLoading: boolean;
  /** Error message for the last failed operation, or null. */
  error: string | null;

  setCurrent: (ds: DatasetMeta) => void;
  setProfile: (profile: FieldProfile[]) => void;
  setChartPreview: (preview: ChartPreview | null) => void;
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
      isLoading: false,
      error: null,

      setCurrent: (ds) => set({ current: ds, error: null }),
      setProfile: (profile) => set({ profile }),
      setChartPreview: (preview) => set({ chartPreview: preview }),
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
