export type RowType =
  | "kpi"
  | "constant"
  | "formula"
  | "subtotal"
  | "total"
  | "opening";

export type ForecastValue = number | null;

export interface ForecastRow {
  id: string;
  name: string;
  rowType: RowType;
  depth: number;
  cells: Record<string, ForecastValue>;
  formulas?: Record<string, string | undefined>;
  children?: ForecastRow[];
  expanded?: boolean;
  childrenCount?: number;
  errors?: Record<string, string | undefined>;
}

export interface ForecastColumn {
  key: string;
  name: string;
  kind: "month" | "label";
  frozen?: boolean;
  width?: number;
  editable?: boolean | ((row: ForecastRow) => boolean);
}
