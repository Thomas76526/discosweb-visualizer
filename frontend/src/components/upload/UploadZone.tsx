import { useCallback, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { loadSample, uploadDataset } from '../../api/datasets';
import { getDatasetProfile } from '../../api/datasets';
import { useDatasetStore } from '../../store/dataset';
import './UploadZone.css';

const ACCEPT = '.csv,.json,.jsonl,.ndjson,.parquet,.pq';

export function UploadZone() {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const setCurrent = useDatasetStore((s) => s.setCurrent);
  const setProfile = useDatasetStore((s) => s.setProfile);
  const setLoading = useDatasetStore((s) => s.setLoading);
  const setError = useDatasetStore((s) => s.setError);
  const isLoading = useDatasetStore((s) => s.isLoading);
  const error = useDatasetStore((s) => s.error);

  const loadAndSet = useCallback(
    async (loader: () => Promise<ReturnType<typeof loadSample>>) => {
      setLoading(true);
      setError(null);
      try {
        const meta = await loader();
        setCurrent(meta);
        // Eagerly fetch profile for the field panel
        try {
          const profile = await getDatasetProfile(meta.id);
          setProfile(profile.fields);
        } catch (e) {
          // Profile fetch failure isn't fatal; user can still see fields from meta
          console.warn('Failed to load profile', e);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [setCurrent, setProfile, setLoading, setError],
  );

  const handleFile = useCallback(
    async (file: File) => {
      await loadAndSet(() => uploadDataset(file));
    },
    [loadAndSet],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) void handleFile(file);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const onPick = useCallback(() => fileInputRef.current?.click(), []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void handleFile(file);
      // Reset value so picking the same file again still triggers change
      e.target.value = '';
    },
    [handleFile],
  );

  return (
    <div className="upload-zone-wrapper">
      <div
        className="upload-zone"
        data-dragover={dragOver}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        role="region"
        aria-label="Upload data file"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          onChange={onFileChange}
          className="upload-zone-input"
          aria-hidden="true"
          tabIndex={-1}
        />
        <div className="upload-zone-icon" aria-hidden="true">
          ⬆
        </div>
        <h2 className="upload-zone-title">拖拽文件到此处</h2>
        <p className="upload-zone-subtitle">
          支持 CSV / JSON / NDJSON / Parquet · 最大 50MB
        </p>
        <div className="upload-zone-actions">
          <Button variant="primary" onClick={onPick} disabled={isLoading}>
            选择文件
          </Button>
          <Button
            variant="secondary"
            onClick={() => loadAndSet(loadSample)}
            disabled={isLoading}
          >
            {isLoading ? '加载中…' : '使用示例数据'}
          </Button>
        </div>
        {error && (
          <div className="upload-zone-error" role="alert">
            ⚠ {error}
          </div>
        )}
      </div>
    </div>
  );
}
