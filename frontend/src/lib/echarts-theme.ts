import * as echarts from 'echarts/core';
import type { EChartsCoreOption } from 'echarts/core';
import type { ChartPreview, ChartType } from '../types/api';

/**
 * Dark workbench ECharts theme.
 *
 * Pulled from design tokens — do not hardcode color hex values here.
 * If you need a new series color, add it to --series-N in tokens.css.
 */
export const darkTheme = {
  color: [
    'oklch(72% 0.18 230)',
    'oklch(75% 0.18 145)',
    'oklch(80% 0.16 75)',
    'oklch(65% 0.22 25)',
    'oklch(70% 0.18 310)',
    'oklch(78% 0.14 195)',
  ],
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    color: 'oklch(75% 0.01 250)',
  },
  title: {
    textStyle: { color: 'oklch(95% 0 0)', fontWeight: 600 },
    subtextStyle: { color: 'oklch(55% 0.01 250)' },
  },
  legend: {
    textStyle: { color: 'oklch(75% 0.01 250)' },
    inactiveColor: 'oklch(40% 0.01 250)',
  },
  grid: {
    left: 40,
    right: 16,
    top: 24,
    bottom: 28,
    containLabel: true,
  },
  categoryAxis: {
    axisLine: { lineStyle: { color: 'oklch(35% 0.01 250)' } },
    axisTick: { show: false },
    axisLabel: { color: 'oklch(55% 0.01 250)', fontSize: 11 },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: 'oklch(55% 0.01 250)', fontSize: 11 },
    splitLine: { lineStyle: { color: 'oklch(28% 0.01 250)', type: 'dashed' } },
  },
  tooltip: {
    backgroundColor: 'oklch(10% 0.01 250 / 0.95)',
    borderColor: 'oklch(35% 0.01 250)',
    borderWidth: 1,
    textStyle: { color: 'oklch(95% 0 0)', fontSize: 12 },
    padding: [8, 12],
    extraCssText: 'backdrop-filter: blur(8px); border-radius: 8px;',
  },
  line: {
    smooth: false,
    symbol: 'circle',
    symbolSize: 6,
    lineStyle: { width: 2 },
    itemStyle: { borderWidth: 0 },
    emphasis: {
      focus: 'series',
      lineStyle: { width: 3 },
      itemStyle: { borderColor: 'oklch(95% 0 0)', borderWidth: 2 },
    },
  },
  bar: {
    itemStyle: {
      borderRadius: [3, 3, 0, 0],
    },
    emphasis: {
      focus: 'series',
      itemStyle: { shadowBlur: 0 },
    },
  },
};

let registered = false;
export function registerDarkTheme(): void {
  if (registered) return;
  registered = true;
  echarts.registerTheme('discosweb-dark', darkTheme);
}

export const THEME_NAME = 'discosweb-dark';

/* ---------- factory functions: build ECharts options from ChartPreview ---------- */

const COMPACT_NUM = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`);

/** X axis labels: union of first series' x values, in original order. */
function xLabelsFromSeries(series: ChartPreview['series']): unknown[] {
  return series[0]?.data.map(([x]) => x) ?? [];
}

export function makeLineOption(series: ChartPreview['series']): EChartsCoreOption {
  const xLabels = xLabelsFromSeries(series);
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: 'oklch(72% 0.18 230)' } },
    },
    legend: { bottom: 0, icon: 'roundRect', itemWidth: 8, itemHeight: 8, itemGap: 14 },
    grid: { left: 40, right: 16, top: 16, bottom: 36, containLabel: true },
    xAxis: { type: 'category', data: xLabels as string[], boundaryGap: false },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (v: number) => COMPACT_NUM(v) },
    },
    series: series.map((s) => ({
      name: s.name,
      type: 'line' as const,
      smooth: false,
      showSymbol: false,
      symbol: 'circle',
      symbolSize: 6,
      sampling: 'lttb' as const,
      lineStyle: { width: 2 },
      emphasis: { focus: 'series' as const },
      data: s.data.map(([, y]) => y),
    })),
  };
}

export function makeBarOption(series: ChartPreview['series']): EChartsCoreOption {
  const xLabels = xLabelsFromSeries(series);
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'oklch(72% 0.18 230 / 0.08)' } },
    },
    legend: series.length > 1 ? { bottom: 0, icon: 'roundRect', itemWidth: 8, itemHeight: 8 } : { show: false },
    grid: { left: 40, right: 16, top: 16, bottom: series.length > 1 ? 36 : 16, containLabel: true },
    xAxis: { type: 'category', data: xLabels as string[] },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (v: number) => COMPACT_NUM(v) },
    },
    series: series.map((s) => ({
      name: s.name,
      type: 'bar' as const,
      data: s.data.map(([, y]) => y),
      barMaxWidth: 36,
      itemStyle: { borderRadius: [4, 4, 0, 0] },
      emphasis: { focus: 'series' as const },
    })),
  };
}

export function makeScatterOption(series: ChartPreview['series']): EChartsCoreOption {
  return {
    tooltip: {
      trigger: 'item',
      formatter: (p: unknown) => {
        const params = p as { seriesName: string; data: [unknown, number] };
        return `${params.seriesName}<br/>x: ${params.data[0]}<br/>y: ${params.data[1]}`;
      },
    },
    grid: { left: 40, right: 16, top: 16, bottom: 16, containLabel: true },
    xAxis: { type: 'value', scale: true },
    yAxis: { type: 'value', scale: true },
    series: series.map((s) => ({
      name: s.name,
      type: 'scatter' as const,
      data: s.data,
      symbolSize: 8,
      emphasis: { focus: 'series' as const },
    })),
  };
}

export function makePieOption(series: ChartPreview['series']): EChartsCoreOption {
  // Pie uses first series only; x becomes the name, y becomes the value
  const first = series[0];
  const data = first?.data.map(([name, value]) => ({ name: String(name), value })) ?? [];
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, icon: 'roundRect', itemWidth: 8, itemHeight: 8 },
    series: [
      {
        name: first?.name ?? '',
        type: 'pie' as const,
        radius: ['45%', '70%'],
        center: ['50%', '45%'],
        data,
        emphasis: { focus: 'series' as const, itemStyle: { shadowBlur: 0 } },
        label: { color: 'oklch(75% 0.01 250)', fontSize: 11 },
      },
    ],
  };
}

/** Dispatch to the right factory by chart type. */
export function makeChartOption(chartType: ChartType, series: ChartPreview['series']): EChartsCoreOption {
  switch (chartType) {
    case 'line': return makeLineOption(series);
    case 'bar': return makeBarOption(series);
    case 'scatter': return makeScatterOption(series);
    case 'pie': return makePieOption(series);
  }
}
