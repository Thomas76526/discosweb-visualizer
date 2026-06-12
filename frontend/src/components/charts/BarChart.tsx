import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart as EBarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { THEME_NAME, registerDarkTheme, makeBarOption } from '../../lib/echarts-theme';
import type { ChartPreview } from '../../types/api';
import './BarChart.css';

let registered = false;
function ensureRegistered() {
  if (registered) return;
  registered = true;
  echarts.use([EBarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);
  registerDarkTheme();
}

export interface BarChartProps {
  series: ChartPreview['series'];
  height?: number;
  ariaLabel?: string;
}

export function BarChart({ series, height = 280, ariaLabel = 'Bar chart' }: BarChartProps) {
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
    chartRef.current.setOption(makeBarOption(series));
  }, [series]);

  return (
    <div
      ref={containerRef}
      className="bar-chart"
      style={{ '--chart-height': `${height}px` } as React.CSSProperties}
      role="img"
      aria-label={ariaLabel}
    />
  );
}
