import { useDatasetStore } from './store/dataset';
import { useUiStore } from './store/ui';
import { Button } from './components/ui/Button';
import { UploadZone } from './components/upload/UploadZone';
import { FieldPanel } from './components/data/FieldPanel';
import { ChartConfigPanel } from './components/data/ChartConfigPanel';
import { LineChart } from './components/charts/LineChart';
import { BarChart } from './components/charts/BarChart';
import type { ChartPreview } from './types/api';
import './App.css';

function App() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const current = useDatasetStore((s) => s.current);
  const chartPreview = useDatasetStore((s) => s.chartPreview);
  // CRITICAL-1 修复:用 store 里的 chartType dispatch 渲染,
  // 不再用 series.length 启发式
  const chartType = useDatasetStore((s) => s.chartType);

  return (
    <div className="app-shell">
      <header className="app-topbar" role="banner">
        <div className="topbar-brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Discosweb</span>
          <span className="brand-divider" aria-hidden="true" />
          <span className="brand-meta">Visualizer · v0.2</span>
        </div>
        <div className="topbar-actions">
          <span className="status-pill" data-tone={current ? 'ok' : 'idle'}>
            <span className="status-dot" aria-hidden="true" />
            {current ? current.name : 'No dataset'}
          </span>
        </div>
      </header>

      {!current ? (
        // Empty state: full-width upload zone
        <main className="app-canvas app-canvas--empty" role="main">
          <UploadZone />
        </main>
      ) : (
        <>
          <aside
            className="app-sidebar"
            data-collapsed={sidebarCollapsed}
            aria-label="Fields"
          >
            <FieldPanel />
            <div className="sidebar-footer">
              <Button variant="ghost" size="sm" onClick={toggleSidebar}>
                {sidebarCollapsed ? 'Expand' : 'Collapse'}
              </Button>
            </div>
          </aside>

          <main className="app-canvas" role="main">
            <div className="canvas-header">
              <h1 className="canvas-title">
                {chartPreview ? 'Chart preview' : 'Configure a chart'}
              </h1>
              <p className="canvas-subtitle">
                {chartPreview
                  ? `${chartPreview.series.length} series · ${current.rows.toLocaleString()} rows`
                  : '选择 X / Y 轴和聚合方式后点击生成图表'}
              </p>
            </div>
            <div className="canvas-chart">
              {chartPreview ? (
                <ChartPreviewRenderer series={chartPreview.series} chartType={chartType} />
              ) : (
                <div className="canvas-empty">
                  <p>暂无图表 — 在右侧配置后点击「生成图表」</p>
                </div>
              )}
            </div>
          </main>

          <aside className="app-configpanel" aria-label="Chart configuration">
            <ChartConfigPanel />
          </aside>
        </>
      )}
    </div>
  );
}

/**
 * Render the chart preview using the user's selected chart type.
 * CRITICAL-1 修复:严格按 store.chartType dispatch,
 * 不再用 series.length 启发式。
 *
 * M1.5: 添加 ScatterChart / PieChart 组件后,这个 switch 就能覆盖全 4 种类型。
 */
function ChartPreviewRenderer({
  series,
  chartType,
}: {
  series: ChartPreview['series'];
  chartType: 'bar' | 'line';
}) {
  if (chartType === 'bar') {
    return <BarChart series={series} height={420} ariaLabel="Bar chart" />;
  }
  return <LineChart series={series} height={420} ariaLabel="Line chart" />;
}

export default App;
