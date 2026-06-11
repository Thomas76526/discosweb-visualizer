import { useUiStore } from './store/ui';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { Surface } from './components/ui/Surface';
import { LineChart } from './components/charts/LineChart';
import { BarChart } from './components/charts/BarChart';
import './App.css';

const sampleLine = {
  xAxis: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  series: [
    { name: 'Requests', data: [820, 932, 901, 1234, 1290, 1330, 1620] },
    { name: 'Errors', data: [12, 18, 9, 27, 31, 22, 41] },
  ],
};

const sampleBar = {
  categories: ['US', 'EU', 'JP', 'SG', 'AU'],
  values: [1240, 980, 412, 318, 209],
};

function App() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <div className="app-shell">
      <header className="app-topbar" role="banner">
        <div className="topbar-brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Discosweb</span>
          <span className="brand-divider" aria-hidden="true" />
          <span className="brand-meta">Visualizer · v0.1</span>
        </div>
        <div className="topbar-actions">
          <span className="status-pill" data-tone="ok">
            <span className="status-dot" aria-hidden="true" />
            Connected
          </span>
          <Button variant="ghost" size="sm">Docs</Button>
          <Button variant="primary" size="sm">New query</Button>
        </div>
      </header>

      <aside className="app-sidebar" data-collapsed={sidebarCollapsed} aria-label="Fields">
        <div className="sidebar-section">
          <h3 className="sidebar-heading">Datasets</h3>
          <ul className="sidebar-list">
            <li className="sidebar-item" data-active="true">
              <span className="sidebar-item-dot" aria-hidden="true" />
              <span className="sidebar-item-name">telemetry.requests</span>
            </li>
            <li className="sidebar-item">
              <span className="sidebar-item-dot" aria-hidden="true" />
              <span className="sidebar-item-name">telemetry.errors</span>
            </li>
            <li className="sidebar-item">
              <span className="sidebar-item-dot" aria-hidden="true" />
              <span className="sidebar-item-name">billing.invoices</span>
            </li>
          </ul>
        </div>
        <div className="sidebar-section">
          <h3 className="sidebar-heading">Fields</h3>
          <ul className="sidebar-list">
            <li className="sidebar-item">
              <span className="sidebar-item-key">ts</span>
              <span className="sidebar-item-type">time</span>
            </li>
            <li className="sidebar-item">
              <span className="sidebar-item-key">region</span>
              <span className="sidebar-item-type">str</span>
            </li>
            <li className="sidebar-item">
              <span className="sidebar-item-key">latency_ms</span>
              <span className="sidebar-item-type">i64</span>
            </li>
            <li className="sidebar-item">
              <span className="sidebar-item-key">status</span>
              <span className="sidebar-item-type">u16</span>
            </li>
          </ul>
        </div>
        <div className="sidebar-footer">
          <Button variant="ghost" size="sm" onClick={toggleSidebar}>
            {sidebarCollapsed ? 'Expand' : 'Collapse'}
          </Button>
        </div>
      </aside>

      <main className="app-canvas" role="main">
        <div className="canvas-header">
          <h1 className="canvas-title">Traffic overview</h1>
          <p className="canvas-subtitle">
            Last 7 days · 5 regions · aggregated per minute
          </p>
        </div>

        <Surface as="section" elevation={1} className="canvas-grid">
          <Card title="Requests vs Errors" subtitle="Daily aggregates">
            <LineChart data={sampleLine} height={280} />
          </Card>
          <Card title="Requests by Region" subtitle="Top 5 regions">
            <BarChart data={sampleBar} height={280} />
          </Card>
        </Surface>

        <Surface as="section" elevation={1} className="canvas-strip">
          <div className="kpi">
            <span className="kpi-label">Total</span>
            <span className="kpi-value">8,127</span>
            <span className="kpi-delta" data-tone="up">+12.4%</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">P95 latency</span>
            <span className="kpi-value">142<span className="kpi-unit">ms</span></span>
            <span className="kpi-delta" data-tone="down">-3.1%</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Error rate</span>
            <span className="kpi-value">0.41<span className="kpi-unit">%</span></span>
            <span className="kpi-delta" data-tone="flat">+0.02%</span>
          </div>
        </Surface>
      </main>

      <aside className="app-configpanel" aria-label="Chart configuration">
        <div className="config-section">
          <h3 className="config-heading">Configuration</h3>
          <div className="config-field">
            <label className="config-label" htmlFor="cfg-window">Time window</label>
            <select id="cfg-window" className="config-input" defaultValue="7d">
              <option value="1h">Last hour</option>
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>
          <div className="config-field">
            <label className="config-label" htmlFor="cfg-bucket">Bucket</label>
            <select id="cfg-bucket" className="config-input" defaultValue="auto">
              <option value="auto">Auto</option>
              <option value="1m">1 minute</option>
              <option value="1h">1 hour</option>
              <option value="1d">1 day</option>
            </select>
          </div>
          <div className="config-field">
            <label className="config-label" htmlFor="cfg-region">Region</label>
            <select id="cfg-region" className="config-input" defaultValue="all">
              <option value="all">All regions</option>
              <option value="us">US</option>
              <option value="eu">EU</option>
              <option value="jp">JP</option>
              <option value="sg">SG</option>
              <option value="au">AU</option>
            </select>
          </div>
        </div>
        <div className="config-section">
          <h3 className="config-heading">Display</h3>
          <div className="config-row">
            <span className="config-row-label">Show errors</span>
            <button type="button" className="toggle" data-on="true" aria-pressed="true">
              <span className="toggle-thumb" aria-hidden="true" />
            </button>
          </div>
          <div className="config-row">
            <span className="config-row-label">Smooth lines</span>
            <button type="button" className="toggle" aria-pressed="false">
              <span className="toggle-thumb" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="config-footer">
          <Button variant="secondary" size="md" block>Reset</Button>
          <Button variant="primary" size="md" block>Apply</Button>
        </div>
      </aside>
    </div>
  );
}

export default App;