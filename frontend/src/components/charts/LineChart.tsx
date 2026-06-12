import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart as ELineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { THEME_NAME, registerDarkTheme, makeLineOption } from '../../lib/echarts-theme';
import type { ChartPreview } from '../../types/api';
import './LineChart.css';

let registered = false;
function ensureRegistered() {
  if (registered) return;
  registered = true;
  echarts.use([
    ELineChart,
    GridComponent,
    TooltipComponent,
    LegendComponent,
    TitleComponent,
    CanvasRenderer,
  ]);
  registerDarkTheme();
}

export interface LineChartProps {
  series: ChartPreview['series'];
  height?: number;
  ariaLabel?: string;
}

export function LineChart({ series, height = 280, ariaLabel = 'Line chart' }: LineChartProps) {
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
    chartRef.current.setOption(makeLineOption(series));
  }, [series]);

  return (
    <div
      ref={containerRef}
      className="line-chart"
      style={{ '--chart-height': `${height}px` } as React.CSSProperties}
      role="img"
      aria-label={ariaLabel}
    />
  );
}
