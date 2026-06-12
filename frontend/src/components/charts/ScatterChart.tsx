import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { ScatterChart as EScatterChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { THEME_NAME, registerDarkTheme, makeScatterOption } from '../../lib/echarts-theme';
import type { ChartPreview } from '../../types/api';
import './ScatterChart.css';

let registered = false;
function ensureRegistered() {
  if (registered) return;
  registered = true;
  echarts.use([EScatterChart, GridComponent, TooltipComponent, CanvasRenderer]);
  registerDarkTheme();
}

export interface ScatterChartProps {
  series: ChartPreview['series'];
  height?: number;
  ariaLabel?: string;
}

export function ScatterChart({ series, height = 280, ariaLabel = 'Scatter chart' }: ScatterChartProps) {
  ensureRegistered();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    chartRef.current = echarts.init(el, THEME_NAME, { renderer: 'canvas' });
    const ro = new ResizeObserver(() => chartRef.current?.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.setOption(makeScatterOption(series));
  }, [series]);

  return (
    <div
      ref={containerRef}
      className="scatter-chart"
      style={{ '--chart-height': `${height}px` } as React.CSSProperties}
      role="img"
      aria-label={ariaLabel}
    />
  );
}
