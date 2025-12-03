import type { ForecastRow } from "@/types/forecast";

export interface SimpleCellAddress {
  sheet: number;
  row: number;
  col: number;
}

export type ValuesUpdatedHandler = (
  changes: { address: SimpleCellAddress; value: unknown }[]
) => void;

export interface FormulaEngine {
  rebuild(rows: ForecastRow[]): void;
  setCellValue(addr: SimpleCellAddress, value: number | null): void;
  setCellFormula(addr: SimpleCellAddress, formula: string): void;
  getCellValue(addr: SimpleCellAddress): unknown;
  onValuesUpdated(callback: ValuesUpdatedHandler): () => void;
  destroy(): void;
}
