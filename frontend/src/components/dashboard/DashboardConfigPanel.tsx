import { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import {
  createDashboard,
  deleteDashboard,
  getDashboard as apiLoadDashboard,
  listDashboards,
  updateDashboard,
} from '../../api/dashboards';
import { useDashboardStore } from '../../store/dashboard';
import { useDatasetStore } from '../../store/dataset';
import type { ChartItem } from '../../types/dashboard';
import type { Aggregation } from '../../types/api';
import './DashboardConfigPanel.css';

let _chartSeq = 0;
function newChartId(): string {
  _chartSeq += 1;
  return `ch-${Date.now()}-${_chartSeq}`;
}

export function DashboardConfigPanel() {
  const list = useDashboardStore((s) => s.list);
  const current = useDashboardStore((s) => s.current);
  const setList = useDashboardStore((s) => s.setList);
  const setCurrent = useDashboardStore((s) => s.setCurrent);
  const addChartToCurrent = useDashboardStore((s) => s.addChartToCurrent);
  const setLoading = useDashboardStore((s) => s.setLoading);
  const setError = useDashboardStore((s) => s.setError);
  const isLoading = useDashboardStore((s) => s.isLoading);
  const errorMsg = useDashboardStore((s) => s.error);

  const dataset = useDatasetStore((s) => s.current);
  const profile = useDatasetStore((s) => s.profile);
  const chartPreview = useDatasetStore((s) => s.chartPreview);
  const chartType = useDatasetStore((s) => s.chartType);

  const [name, setName] = useState('Untitled dashboard');
  const [description, setDescription] = useState('');

  // Initial load of the list
  useEffect(() => {
    setLoading(true);
    listDashboards()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshList = useCallback(async () => {
    setList(await listDashboards());
  }, [setList]);

  const onAddCurrentAsChart = useCallback(() => {
    if (!dataset || !chartPreview) return;
    const xFields = (profile ?? dataset.fields).map((f) => f.name);
    addChartToCurrent({
      id: newChartId(),
      datasetId: dataset.id,
      chartType,
      xField: xFields[0] ?? '',
      yField: xFields.find((n) => n !== xFields[0]) ?? xFields[0] ?? '',
      aggregation: 'sum' as Aggregation,
      title: `${dataset.name} · ${chartType}`,
      x: 0,
      y: 9999, // append to bottom
      w: 6,
      h: 4,
    } as ChartItem);
  }, [dataset, chartPreview, chartType, profile, addChartToCurrent]);

  const onSave = useCallback(async () => {
    if (!current) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await updateDashboard(current.id, {
        name: name || current.name,
        description,
        charts: current.charts,
      });
      setCurrent(updated);
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [current, name, description, setCurrent, setLoading, setError, refreshList]);

  const onCreate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const created = await createDashboard({
        name: name || 'Untitled dashboard',
        description,
        charts: current?.charts ?? [],
      });
      setCurrent(created);
      setName(created.name);
      setDescription(created.description);
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [name, description, current, setCurrent, setLoading, setError, refreshList]);

  const onLoad = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);
      try {
        const d = await apiLoadDashboard(id);
        setCurrent(d);
        setName(d.name);
        setDescription(d.description);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [setCurrent, setLoading, setError],
  );

  const onDelete = useCallback(async () => {
    if (!current) return;
    if (!window.confirm(`Delete dashboard "${current.name}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      await deleteDashboard(current.id);
      setCurrent(null);
      setName('Untitled dashboard');
      setDescription('');
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [current, setCurrent, setLoading, setError, refreshList]);

  const onCopyShare = useCallback(() => {
    if (!current) return;
    const url = `${window.location.origin}/d/${current.id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => setError(null))
      .catch(() => setError('Copy failed; you can copy the URL from the address bar'));
  }, [current, setError]);

  return (
    <div className="dash-config-panel">
      <div className="dash-config-section">
        <h3 className="dash-config-heading">Dashboard</h3>
        <div className="dash-config-field">
          <label className="dash-config-label" htmlFor="dash-name">Name</label>
          <input
            id="dash-name"
            className="dash-config-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My dashboard"
          />
        </div>
        <div className="dash-config-field">
          <label className="dash-config-label" htmlFor="dash-desc">Description</label>
          <input
            id="dash-desc"
            className="dash-config-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's it about?"
          />
        </div>
      </div>

      <div className="dash-config-section">
        <h3 className="dash-config-heading">Add chart</h3>
        <Button
          variant="secondary"
          size="sm"
          block
          onClick={onAddCurrentAsChart}
          disabled={!dataset || !chartPreview}
        >
          + 当前图表加入看板
        </Button>
        <p className="dash-config-hint">
          先在「图表」面板配置并预览图表,再点上方按钮加入。
        </p>
      </div>

      <div className="dash-config-section">
        <h3 className="dash-config-heading">保存 / 加载</h3>
        <div className="dash-config-actions">
          {current ? (
            <Button variant="primary" size="sm" onClick={onSave} disabled={isLoading}>
              保存
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={onCreate} disabled={isLoading}>
              新建看板
            </Button>
          )}
          {current && (
            <>
              <Button variant="ghost" size="sm" onClick={onCopyShare}>
                复制分享链接
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete} data-tone="danger">
                删除
              </Button>
            </>
          )}
        </div>
        {current && (
          <p className="dash-config-hint">
            看板 ID: <code className="dash-config-id">{current.id}</code>
          </p>
        )}
      </div>

      <div className="dash-config-section dash-config-list">
        <h3 className="dash-config-heading">已保存 ({list.length})</h3>
        {list.length === 0 ? (
          <p className="dash-config-hint">还没有看板</p>
        ) : (
          <ul className="dash-config-list-items">
            {list.map((d) => (
              <li
                key={d.id}
                className="dash-config-list-item"
                data-active={current?.id === d.id}
              >
                <button
                  type="button"
                  className="dash-config-list-btn"
                  onClick={() => onLoad(d.id)}
                >
                  <span className="dash-config-list-name">{d.name}</span>
                  <span className="dash-config-list-meta">
                    {d.chartCount} 图 · {d.updatedAt.split('T')[0]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {errorMsg && (
        <div className="dash-config-error" role="alert">
          ⚠ {errorMsg}
        </div>
      )}
    </div>
  );
}
