/**
 * Dataset API functions. All go through the Vite /api proxy → backend.
 */
import { api } from './client';
import type { ChartPreview, ChartSpec, DatasetMeta, DatasetProfile } from '../types/api';

/** Upload a file and return the new dataset's metadata. */
export async function uploadDataset(file: File): Promise<DatasetMeta> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/datasets/upload', {
    method: 'POST',
    body: form,
    // No Content-Type header — let the browser set multipart boundary
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text || res.statusText}`);
  }
  return (await res.json()) as DatasetMeta;
}

/** Load the bundled sample dataset (data/sample/sample-sales-2025.csv). */
export async function loadSample(): Promise<DatasetMeta> {
  return api.post<DatasetMeta>('/datasets/from-sample', {});
}

/** Fetch a dataset's metadata (by id). */
export async function getDataset(id: string): Promise<DatasetMeta> {
  return api.get<DatasetMeta>(`/datasets/${encodeURIComponent(id)}`);
}

/** Fetch per-field statistics. */
export async function getDatasetProfile(id: string): Promise<DatasetProfile> {
  return api.get<DatasetProfile>(`/datasets/${encodeURIComponent(id)}/profile`);
}

/** Request a chart preview (aggregation + grouping). */
export async function previewChart(spec: ChartSpec): Promise<ChartPreview> {
  return api.post<ChartPreview>('/charts/preview', spec);
}
