import * as echarts from 'echarts/core';

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

export function registerDarkTheme(): void {
  echarts.registerTheme('discosweb-dark', darkTheme);
}

export const THEME_NAME = 'discosweb-dark';