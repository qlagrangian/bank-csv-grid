import {
  DetailedCellError,
  ExportedCellChange,
  HyperFormula,
} from "hyperformula";
import type { ForecastRow } from "@/types/forecast";
import type {
  FormulaEngine,
  SimpleCellAddress,
  ValuesUpdatedHandler,
} from "./formulaEngine";
import { CoordinateMapper } from "./coordinateMapper";

export function normalizeFormulaForHF(input: string) {
  const trimmed = input.trim();
  const withPrefix = trimmed.startsWith("=") ? trimmed : `=${trimmed}`;
  return withPrefix.replace(
    /(\$?[A-Z]+)(\$?)(\d+)/g,
    (_, col, dollarRow, row) => `${col}${dollarRow}${Number(row) + 1}`
  );
}

export class HyperformulaAdapter implements FormulaEngine {
  private hf: HyperFormula;
  private sheetId: number;
  private mapper: CoordinateMapper;

  constructor(mapper: CoordinateMapper) {
    this.mapper = mapper;
    this.hf = HyperFormula.buildFromArray([[]], {
      licenseKey: "gpl-v3",
      useColumnIndex: true,
    });
    this.sheetId = 0;
  }

  rebuild(rows: ForecastRow[]) {
    const keys = this.mapper.columnKeys();
    const matrix = rows.map((row) =>
      keys.map((colKey) => {
        const formula = row.formulas?.[colKey];
        if (formula) return normalizeFormulaForHF(formula);
        return row.cells[colKey] ?? null;
      })
    );
    this.hf.setSheetContent(this.sheetId, matrix);
  }

  setCellValue(addr: SimpleCellAddress, value: number | null) {
    this.hf.setCellContents(addr, [[value ?? null]]);
  }

  setCellFormula(addr: SimpleCellAddress, formula: string) {
    this.hf.setCellContents(addr, [[normalizeFormulaForHF(formula)]]);
  }

  getCellValue(addr: SimpleCellAddress) {
    return this.hf.getCellValue(addr);
  }

  onValuesUpdated(callback: ValuesUpdatedHandler) {
    const handler = (changes: any[]) => {
      const mapped = changes
        .filter((c): c is ExportedCellChange => "address" in c)
        .map((change) => ({
          address: change.address,
          value: change.value,
        }));
      callback(mapped);
    };
    this.hf.on("valuesUpdated", handler);
    return () => this.hf.off("valuesUpdated", handler);
  }

  destroy() {
    this.hf.destroy();
  }
}
