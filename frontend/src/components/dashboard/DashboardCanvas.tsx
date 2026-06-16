import { useMemo } from 'react';
// react-grid-layout 1.5+ moved the original API (incl. WidthProvider + class
// components) into /legacy. New 1.5 API is hooks-based and ships in the main
// entry; we use /legacy for stability until the hooks API is stable enough.
import { ReactGridLayout, WidthProvider, type LayoutItem } from 'react-grid-layout/legacy';
import 'react-grid-layout/legacy/css/styles.css';
import { useDashboardStore } from '../../store/dashboard';
import { ChartCard } from './ChartCard';
import './DashboardCanvas.css';

const ResponsiveGridLayout = WidthProvider(ReactGridLayout);

export interface DashboardCanvasProps {
  /** When true (default), charts are draggable + resizable. */
  editable?: boolean;
  /** Optional read-only view that hides the title bar / close buttons. */
  readonly?: boolean;
}

export function DashboardCanvas({ editable = true, readonly = false }: DashboardCanvasProps) {
  const current = useDashboardStore((s) => s.current);
  const updateChartInCurrent = useDashboardStore((s) => s.updateChartInCurrent);
  const removeChartFromCurrent = useDashboardStore((s) => s.removeChartFromCurrent);

  // react-grid-layout's Layout uses {i, x, y, w, h}; we own the canonical
  // shape in ChartItem, so we map back and forth on each change.
  const layout: LayoutItem[] = useMemo(
    () =>
      (current?.charts ?? []).map((c) => ({
        i: c.id,
        x: c.x,
        y: c.y,
        w: c.w,
        h: c.h,
      })),
    [current?.charts],
  );

  if (!current) {
    return (
      <div className="dashboard-canvas dashboard-canvas--empty">
        <div className="dashboard-canvas--empty-inner">
          <h2>没有看板</h2>
          <p>从右侧保存当前图表为看板,或加载已有看板。</p>
        </div>
      </div>
    );
  }

  if (current.charts.length === 0) {
    return (
      <div className="dashboard-canvas dashboard-canvas--empty">
        <div className="dashboard-canvas--empty-inner">
          <h2>「{current.name}」是空看板</h2>
          <p>点击右上「添加图表」开始构建。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-canvas">
      <ResponsiveGridLayout
        layout={layout}
        cols={12}
        rowHeight={36}
        margin={[12, 12]}
        containerPadding={[0, 0]}
        isDraggable={editable}
        isResizable={editable}
        draggableHandle=".chart-card-titlebar"
        onLayoutChange={(next) => {
          // next is the new layout (Layout = readonly LayoutItem[]).
          for (const item of next) {
            const chart = current.charts.find((c) => c.id === item.i);
            if (!chart) continue;
            if (
              chart.x !== item.x ||
              chart.y !== item.y ||
              chart.w !== item.w ||
              chart.h !== item.h
            ) {
              updateChartInCurrent(item.i, {
                x: item.x,
                y: item.y,
                w: item.w,
                h: item.h,
              });
            }
          }
        }}
      >
        {current.charts.map((c) => (
          <div key={c.id}>
            <ChartCard
              chart={c}
              readonly={readonly}
              onRemove={!readonly ? removeChartFromCurrent : undefined}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
