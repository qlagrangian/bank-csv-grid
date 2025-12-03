import type { ForecastColumn } from "@/types/forecast";
import type { SimpleCellAddress } from "./formulaEngine";

function indexToColumnLabel(index: number) {
  let dividend = index + 1;
  let label = "";
  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    label = String.fromCharCode(65 + modulo) + label;
    dividend = Math.floor((dividend - modulo) / 26);
  }
  return label;
}

export class CoordinateMapper {
  private colKeyToIndex: Map<string, number>;
  private indexToColKey: Map<number, string>;

  constructor(columns: Array<ForecastColumn | string>) {
    const keys = columns
      .map((col) => (typeof col === "string" ? col : col.key))
      .filter(Boolean);
    this.colKeyToIndex = new Map(keys.map((key, idx) => [key, idx]));
    this.indexToColKey = new Map(keys.map((key, idx) => [idx, key]));
  }

  toHFAddress(rowIdx: number, colKey: string): SimpleCellAddress {
    const col = this.colKeyToIndex.get(colKey);
    if (col === undefined) {
      throw new Error(`Unknown column key: ${colKey}`);
    }
    return { sheet: 0, row: rowIdx, col };
  }

  fromHFAddress(addr: SimpleCellAddress) {
    const colKey = this.indexToColKey.get(addr.col);
    if (!colKey) {
      throw new Error(`Unknown column index: ${addr.col}`);
    }
    return { rowIdx: addr.row, colKey };
  }

  columnLabel(colKey: string) {
    const idx = this.colKeyToIndex.get(colKey);
    if (idx === undefined) {
      throw new Error(`Unknown column key: ${colKey}`);
    }
    return indexToColumnLabel(idx);
  }

  columnKeys() {
    return Array.from(this.colKeyToIndex.keys());
  }
}
