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
import { THEME_NAME, registerDarkTheme } from '../../lib/echarts-theme';
import './LineChart.css';

echarts.use([
  ELineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer,
]);

registerDarkTheme();

export interface LineSeries {
  name: string;
  data: number[];
}

export interface LineChartProps {
  data: { xAxis: string[]; series: LineSeries[] };
  height?: number;
  smooth?: boolean;
  showLegend?: boolean;
}

export function LineChart({ data, height = 280, smooth = false, showLegend = true }: LineChartProps) {
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
          axisPointer: { type: 'line', lineStyle: { color: 'oklch(72% 0.18 230)' } },
        },
        legend: showLegend
          ? {
              bottom: 0,
              icon: 'roundRect',
              itemWidth: 8,
              itemHeight: 8,
              itemGap: 14,
              textStyle: { color: 'oklch(75% 0.01 250)' },
            }
          : { show: false },
        grid: { left: 40, right: 16, top: 16, bottom: showLegend ? 36 : 16, containLabel: true },
        xAxis: {
          type: 'category',
          data: data.xAxis,
          boundaryGap: false,
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`),
          },
        },
        series: data.series.map((s, idx) => ({
          name: s.name,
          type: 'line',
          smooth,
          showSymbol: false,
          symbol: 'circle',
          symbolSize: 6,
          sampling: 'lttb',
          lineStyle: { width: 2 },
          emphasis: { focus: 'series' },
          data: s.data,
          itemStyle: {
            color: idx === 0 ? 'oklch(72% 0.18 230)' : 'oklch(65% 0.22 25)',
          },
          areaStyle:
            idx === 0
              ? {
                  opacity: 0.18,
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: 'oklch(72% 0.18 230 / 0.35)' },
                    { offset: 1, color: 'oklch(72% 0.18 230 / 0)' },
                  ]),
                }
              : undefined,
        })),
      },
      { notMerge: true },
    );
  }, [data, smooth, showLegend]);

  return (
    <div
      ref={containerRef}
      className="line-chart"
      style={{ height: `${height}px` }}
      role="img"
      aria-label="Line chart"
    />
  );
}