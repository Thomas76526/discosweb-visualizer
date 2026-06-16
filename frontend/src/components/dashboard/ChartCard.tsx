import { useEffect, useState } from 'react';
import { LineChart } from '../charts/LineChart';
import { BarChart } from '../charts/BarChart';
import { ScatterChart } from '../charts/ScatterChart';
import { PieChart } from '../charts/PieChart';
import { previewChart } from '../../api/datasets';
import type { ChartPreview, ChartType } from '../../types/api';
import type { ChartItem } from '../../types/dashboard';
import { Button } from '../ui/Button';
import './ChartCard.css';

export interface ChartCardProps {
  chart: ChartItem;
  /** When true, hide the title bar / close button (e.g. on the read-only view) */
  readonly?: boolean;
  onRemove?: (chartId: string) => void;
}

export function ChartCard({
  chart,
  readonly = false,
  onRemove,
}: ChartCardProps) {
  const [preview, setPreview] = useState<ChartPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    previewChart({
      datasetId: chart.datasetId,
      chartType: chart.chartType,
      xField: chart.xField,
      yField: chart.yField,
      groupBy: chart.groupBy,
      aggregation: chart.aggregation,
    })
      .then((p) => {
        if (!cancelled) setPreview(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    chart.datasetId,
    chart.chartType,
    chart.xField,
    chart.yField,
    chart.groupBy,
    chart.aggregation,
  ]);

  return (
    <div className="chart-card" data-readonly={readonly}>
      {!readonly && (
        <div className="chart-card-titlebar" data-drag-handle>
          <span className="chart-card-title">
            {chart.title || `${chart.chartType} · ${chart.xField} → ${chart.yField}`}
          </span>
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(chart.id)}
              onMouseDown={(e) => e.stopPropagation()}
              aria-label="Remove chart"
            >
              ×
            </Button>
          )}
        </div>
      )}
      <div className="chart-card-body">
        {loading && <div className="chart-card-state">加载中…</div>}
        {error && (
          <div className="chart-card-state" data-tone="error" role="alert">
            ⚠ {error}
          </div>
        )}
        {preview && !loading && !error && (
          <ChartCardBody chartType={chart.chartType} series={preview.series} />
        )}
      </div>
    </div>
  );
}

function ChartCardBody({
  chartType,
  series,
}: {
  chartType: ChartType;
  series: ChartPreview['series'];
}) {
  switch (chartType) {
    case 'bar':
      return <BarChart series={series} ariaLabel="Bar chart" />;
    case 'line':
      return <LineChart series={series} ariaLabel="Line chart" />;
    case 'scatter':
      return <ScatterChart series={series} ariaLabel="Scatter chart" />;
    case 'pie':
      return <PieChart series={series} ariaLabel="Pie chart" />;
  }
}
