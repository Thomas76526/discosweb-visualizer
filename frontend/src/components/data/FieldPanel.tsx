import { useDatasetStore } from '../../store/dataset';
import './FieldPanel.css';

export function FieldPanel() {
  const profile = useDatasetStore((s) => s.profile);
  const dataset = useDatasetStore((s) => s.current);

  if (!dataset) return null;

  return (
    <div className="field-panel">
      <div className="field-panel-section">
        <h3 className="field-panel-heading">Dataset</h3>
        <div className="field-panel-meta">
          <span className="field-panel-name" title={dataset.name}>
            {dataset.name}
          </span>
          <span className="field-panel-rows">{dataset.rows.toLocaleString()} 行</span>
        </div>
      </div>

      <div className="field-panel-section field-panel-fields">
        <h3 className="field-panel-heading">Fields ({profile?.length ?? dataset.fields.length})</h3>
        <ul className="field-panel-list">
          {(profile ?? dataset.fields.map((f) => ({ ...f, nulls: 0, distinct: 0, top: [] }))).map(
            (f) => (
              <li key={f.name} className="field-panel-item">
                <span className="field-panel-item-name">{f.name}</span>
                <span className="field-panel-item-type">{f.type}</span>
                {'nulls' in f && f.nulls > 0 && (
                  <span className="field-panel-item-badge" title="null count">
                    {f.nulls}∅
                  </span>
                )}
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
}
