import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface UiState {
  /** Left sidebar collapsed state */
  sidebarCollapsed: boolean;
  /** Right config panel collapsed state */
  configCollapsed: boolean;
  /** Active dataset id (matches sidebar selection) */
  activeDatasetId: string;
  /** Global loading state for topbar spinner */
  isLoading: boolean;

  toggleSidebar: () => void;
  toggleConfig: () => void;
  setActiveDataset: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useUiStore = create<UiState>()(
  devtools(
    (set) => ({
      sidebarCollapsed: false,
      configCollapsed: false,
      activeDatasetId: 'telemetry.requests',
      isLoading: false,

      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      toggleConfig: () =>
        set((s) => ({ configCollapsed: !s.configCollapsed })),
      setActiveDataset: (id) => set({ activeDatasetId: id }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    { name: 'discosweb-ui' },
  ),
);