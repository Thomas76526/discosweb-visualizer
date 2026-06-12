import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { PieChart as EPieChart } from 'echarts/charts';
import {
  TooltipComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { THEME_NAME, registerDarkTheme, makePieOption } from '../../lib/echarts-theme';
import type { ChartPreview } from '../../types/api';
import './PieChart.css';

let registered = false;
function ensureRegistered() {
  if (registered) return;
  registered = true;
  echarts.use([EPieChart, TooltipComponent, LegendComponent, CanvasRenderer]);
  registerDarkTheme();
}

export interface PieChartProps {
  series: ChartPreview['series'];
  height?: number;
  ariaLabel?: string;
}

export function PieChart({ series, height = 280, ariaLabel = 'Pie chart' }: PieChartProps) {
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
    chartRef.current.setOption(makePieOption(series));
  }, [series]);

  return (
    <div
      ref={containerRef}
      className="pie-chart"
      style={{ '--chart-height': `${height}px` } as React.CSSProperties}
      role="img"
      aria-label={ariaLabel}
    />
  );
}
