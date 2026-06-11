import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { BarChart as EBarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { THEME_NAME, registerDarkTheme } from '../../lib/echarts-theme';
import './BarChart.css';

echarts.use([EBarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

registerDarkTheme();

export interface BarChartProps {
  data: { categories: string[]; values: number[] };
  height?: number;
  showLegend?: boolean;
}

export function BarChart({ data, height = 280, showLegend = false }: BarChartProps) {
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
    chartRef.current.setOption(
      {
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow', shadowStyle: { color: 'oklch(72% 0.18 230 / 0.08)' } },
        },
        legend: showLegend
          ? { bottom: 0, icon: 'roundRect', itemWidth: 8, itemHeight: 8 }
          : { show: false },
        grid: { left: 40, right: 16, top: 16, bottom: showLegend ? 36 : 16, containLabel: true },
        xAxis: {
          type: 'category',
          data: data.categories,
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`),
          },
        },
        series: [
          {
            name: 'Requests',
            type: 'bar',
            data: data.values,
            barMaxWidth: 36,
            itemStyle: {
              borderRadius: [4, 4, 0, 0],
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'oklch(72% 0.18 230)' },
                { offset: 1, color: 'oklch(55% 0.18 230)' },
              ]),
            },
            emphasis: {
              focus: 'series',
              itemStyle: { color: 'oklch(78% 0.18 230)' },
            },
          },
        ],
      },
      { notMerge: true },
    );
  }, [data, showLegend]);

  return (
    <div
      ref={containerRef}
      className="bar-chart"
      style={{ height: `${height}px` }}
      role="img"
      aria-label="Bar chart"
    />
  );
}