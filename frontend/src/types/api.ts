/**
 * TypeScript types mirroring backend Pydantic models.
 *
 * Wire format uses camelCase (Pydantic `alias` on the backend). When the
 * generated OpenAPI client is wired in, these can be replaced wholesale.
 */

export type FieldType = string; // e.g. "String", "Int64", "Float64", "Date"

export interface FieldInfo {
  name: string;
  type: FieldType;
}

export interface DatasetMeta {
  id: string;
  name: string;
  rows: number;
  fields: FieldInfo[];
  sample: Array<Record<string, unknown>>;
}

export interface FieldProfile extends FieldInfo {
  nulls: number;
  distinct: number;
  min?: unknown;
  max?: unknown;
  top: unknown[];
}

export interface DatasetProfile {
  fields: FieldProfile[];
}

export type ChartType = 'bar' | 'line' | 'scatter' | 'pie';
export type Aggregation = 'sum' | 'avg' | 'count' | 'min' | 'max';

export interface ChartSpec {
  datasetId: string;
  chartType: ChartType;
  xField: string;
  yField: string;
  groupBy?: string;
  aggregation?: Aggregation;
}

export interface ChartSeries {
  name: string;
  data: Array<[unknown, number]>;
}

export interface ChartPreview {
  series: ChartSeries[];
}
