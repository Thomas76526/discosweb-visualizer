import { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { previewChart } from '../../api/datasets';
import { useDatasetStore } from '../../store/dataset';
import type { Aggregation, ChartType } from '../../types/api';
import './ChartConfigPanel.css';

const CHART_TYPES: { value: ChartType; label: string; enabled: boolean }[] = [
  // CRITICAL-1 修复:M1 暂不接 ScatterChart / PieChart 组件,
  // 但 makeScatterOption / makePieOption 工厂已实现(echarts-theme.ts)
  // 等 M1.5 加 ScatterChart / PieChart 组件后,把 enabled 改 true 即可
  { value: 'bar', label: '柱状图', enabled: true },
  { value: 'line', label: '折线图', enabled: true },
  { value: 'scatter', label: '散点图 (M1.5)', enabled: false },
  { value: 'pie', label: '饼图 (M1.5)', enabled: false },
];

const AGGREGATIONS: { value: Aggregation; label: string }[] = [
  { value: 'sum', label: '求和' },
  { value: 'avg', label: '均值' },
  { value: 'count', label: '计数' },
  { value: 'min', label: '最小' },
  { value: 'max', label: '最大' },
];

export function ChartConfigPanel() {
  const dataset = useDatasetStore((s) => s.current);
  const profile = useDatasetStore((s) => s.profile);
  const setChartPreview = useDatasetStore((s) => s.setChartPreview);
  const setLoading = useDatasetStore((s) => s.setLoading);
  const setError = useDatasetStore((s) => s.setError);
  // CRITICAL-1 修复:chartType 现在从 store 读 / 写,
  // 让 App 的 ChartPreviewRenderer 能直接 dispatch 到对应的组件
  const chartType = useDatasetStore((s) => s.chartType);
  const setChartType = useDatasetStore((s) => s.setChartType);
  const isLoading = useDatasetStore((s) => s.isLoading);

  const fields = profile ?? dataset?.fields ?? [];

  const [xField, setXField] = useState<string>('');
  const [yField, setYField] = useState<string>('');
  const [groupBy, setGroupBy] = useState<string>('');
  const [aggregation, setAggregation] = useState<Aggregation>('sum');

  // Auto-pick sensible defaults when the dataset changes
  useEffect(() => {
    if (!fields.length) {
      setXField('');
      setYField('');
      return;
    }
    // Pick first string field as X, first numeric-looking field as Y
    const x = fields.find((f) => f.type.toLowerCase().includes('str'))?.name ?? fields[0]?.name ?? '';
    const y = fields.find((f) => {
      const t = f.type.toLowerCase();
      return t.includes('int') || t.includes('float') || t.includes('double') || t.includes('decimal');
    })?.name ?? fields.find((f) => f.name !== x)?.name ?? '';
    setXField(x);
    setYField(y);
  }, [fields]);

  const onRender = useCallback(async () => {
    if (!dataset || !xField || !yField) return;
    setLoading(true);
    setError(null);
    try {
      const preview = await previewChart({
        datasetId: dataset.id,
        chartType,
        xField,
        yField,
        groupBy: groupBy || undefined,
        aggregation,
      });
      setChartPreview(preview);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [dataset, chartType, xField, yField, groupBy, aggregation, setChartPreview, setLoading, setError]);

  if (!dataset) return null;

  return (
    <div className="config-panel">
      <div className="config-panel-section">
        <h3 className="config-panel-heading">Chart</h3>

        <div className="config-panel-field">
          <label className="config-panel-label" htmlFor="chart-type">类型</label>
          <select
            id="chart-type"
            className="config-panel-input"
            value={chartType}
            onChange={(e) => {
              const next = e.target.value as ChartType;
              // 只在 enabled 的选项中切换;若用户选未实现的类型,保持当前值
              const opt = CHART_TYPES.find((t) => t.value === next);
              if (opt?.enabled) setChartType(next);
            }}
          >
            {CHART_TYPES.map((t) => (
              <option key={t.value} value={t.value} disabled={!t.enabled}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="config-panel-field">
          <label className="config-panel-label" htmlFor="x-field">X 轴</label>
          <select
            id="x-field"
            className="config-panel-input"
            value={xField}
            onChange={(e) => setXField(e.target.value)}
          >
            <option value="">— 选择字段 —</option>
            {fields.map((f) => (
              <option key={f.name} value={f.name}>{f.name}</option>
            ))}
          </select>
        </div>

        <div className="config-panel-field">
          <label className="config-panel-label" htmlFor="y-field">Y 轴</label>
          <select
            id="y-field"
            className="config-panel-input"
            value={yField}
            onChange={(e) => setYField(e.target.value)}
          >
            <option value="">— 选择字段 —</option>
            {fields.map((f) => (
              <option key={f.name} value={f.name}>{f.name}</option>
            ))}
          </select>
        </div>

        <div className="config-panel-field">
          <label className="config-panel-label" htmlFor="agg">聚合方式</label>
          <select
            id="agg"
            className="config-panel-input"
            value={aggregation}
            onChange={(e) => setAggregation(e.target.value as Aggregation)}
            disabled={chartType === 'scatter'}
          >
            {AGGREGATIONS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        <div className="config-panel-field">
          <label className="config-panel-label" htmlFor="groupby">分组 (可选)</label>
          <select
            id="groupby"
            className="config-panel-input"
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
          >
            <option value="">— 不分组 —</option>
            {fields.map((f) => (
              <option key={f.name} value={f.name}>{f.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="config-panel-footer">
        <Button
          variant="primary"
          size="md"
          block
          onClick={onRender}
          disabled={isLoading || !xField || !yField}
        >
          {isLoading ? '渲染中…' : '生成图表'}
        </Button>
      </div>
    </div>
  );
}
