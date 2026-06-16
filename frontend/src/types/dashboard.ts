/**
 * TypeScript types mirroring backend dashboard Pydantic models.
 */
import type { Aggregation, ChartType } from './api';

/** Identifier rules — same as backend. */
export type DashShortId = string;

export interface ChartItem {
  id: string;
  datasetId: string;
  chartType: ChartType;
  xField: string;
  yField: string;
  groupBy?: string;
  aggregation?: Aggregation;
  title: string;
  /** react-grid-layout grid coordinates */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardCreate {
  name: string;
  description: string;
  charts: ChartItem[];
}

export interface Dashboard {
  id: DashShortId;
  name: string;
  description: string;
  charts: ChartItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardListItem {
  id: DashShortId;
  name: string;
  description: string;
  chartCount: number;
  updatedAt: string;
}
