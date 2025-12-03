"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DataGrid, type FillEvent, type RowsChangeData } from "react-data-grid";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DetailedCellError } from "hyperformula";
import { CoordinateMapper } from "@/lib/coordinateMapper";
import { HyperformulaAdapter } from "@/lib/hyperformulaAdapter";
import type { ForecastRow } from "@/types/forecast";
import {
  buildForecastColumns,
  flattenForecastRows,
  DEFAULT_FORECAST_START_DATE,
  isCellEditable,
} from "@/utils/forecastGrid";
import { defaultColumnOptions } from "@/utils/gridDefaults";

const MONTHS_TO_RENDER = 12;

function addMonths(base: string, delta: number) {
  const [y, m] = base.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthRange(start: string, count: number) {
  const months: string[] = [];
  for (let i = 0; i < count; i += 1) {
    months.push(addMonths(start, i));
  }
  return months;
}

function emptyCells(months: string[]) {
  return months.reduce<Record<string, number | null>>((acc, m) => {
    acc[`m_${m}`] = null;
    return acc;
  }, {});
}

function buildInitialRows(months: string[]): ForecastRow[] {
  const cellsTemplate = emptyCells(months);
  const firstKey = `m_${months[0]}`;

  const rows: ForecastRow[] = [
    {
      id: "opening",
      name: "期首残高",
      rowType: "opening",
      depth: 0,
      cells: { ...cellsTemplate, [firstKey]: 0 },
      formulas: {},
    },
    {
      id: "sales",
      name: "売上",
      rowType: "kpi",
      depth: 0,
      cells: { ...cellsTemplate, [firstKey]: 1_000_000 },
    },
    {
      id: "cost",
      name: "支出",
      rowType: "kpi",
      depth: 0,
      cells: { ...cellsTemplate, [firstKey]: 300_000 },
    },
    {
      id: "growth",
      name: "成長率",
      rowType: "constant",
      depth: 0,
      cells: { ...cellsTemplate, [firstKey]: 0.05 },
    },
    {
      id: "ad",
      name: "広告費 (売上×係数)",
      rowType: "formula",
      depth: 0,
      cells: { ...cellsTemplate },
      formulas: {},
    },
    {
      id: "net",
      name: "営業ネットキャッシュ",
      rowType: "formula",
      depth: 0,
      cells: { ...cellsTemplate },
      formulas: {},
    },
    {
      id: "cumulative",
      name: "累積営業ネットキャッシュ",
      rowType: "formula",
      depth: 0,
      cells: { ...cellsTemplate },
      formulas: {},
    },
  ];

  const rowIndex = rows.reduce<Record<string, number>>((acc, row, idx) => {
    acc[row.id] = idx;
    return acc;
  }, {});

  const monthLabel = (colIdx: number) => {
    const dividend = colIdx + 1;
    const label = [];
    let n = dividend;
    while (n > 0) {
      const mod = (n - 1) % 26;
      label.unshift(String.fromCharCode(65 + mod));
      n = Math.floor((n - mod) / 26);
    }
    return label.join("");
  };

  months.forEach((m, colIdx) => {
    const colLabel = monthLabel(colIdx);
    const key = `m_${m}`;

    // 広告費 = 売上 * 成長率
    const adFormula = `=${colLabel}${rowIndex.sales}*${colLabel}${rowIndex.growth}`;
    rows[rowIndex.ad].formulas![key] = adFormula;

    // 営業ネット = 売上 - 広告費 - 支出
    const netFormula = `=${colLabel}${rowIndex.sales}-${colLabel}${rowIndex.ad}-${colLabel}${rowIndex.cost}`;
    rows[rowIndex.net].formulas![key] = netFormula;

    // 累積ネット: 前月累積 + 当月営業ネット + 期首
    if (colIdx === 0) {
      rows[rowIndex.cumulative].formulas![key] = `=${colLabel}${rowIndex.opening}+${colLabel}${rowIndex.net}`;
    } else {
      const prevColLabel = monthLabel(colIdx - 1);
      rows[rowIndex.cumulative].formulas![key] = `=${prevColLabel}${rowIndex.cumulative}+${colLabel}${rowIndex.net}`;
      // 期首残高: 前月累積を繰越
      rows[rowIndex.opening].formulas![key] = `=${prevColLabel}${rowIndex.cumulative}`;
    }
  });

  return rows;
}

function coerceInput(value: unknown) {
  if (value === null || value === undefined) {
    return { value: null as number | null, formula: undefined as string | undefined };
  }
  if (typeof value === "number") {
    return { value, formula: undefined };
  }
  const text = String(value).trim();
  if (!text) return { value: null, formula: undefined };
  if (text.startsWith("=")) {
    return { value: null, formula: text };
  }
  const num = Number(text);
  return { value: Number.isNaN(num) ? null : num, formula: undefined };
}

type Props = {
  actualMonths?: string[];
};

function deriveMonths(actual: string[], horizon = MONTHS_TO_RENDER) {
  const sorted = [...new Set(actual)].sort();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
  const baseStart = sorted[0] ?? currentMonth;
  const lastActual = sorted[sorted.length - 1] ?? baseStart;
  const needed = Math.max(horizon - sorted.length, 0);
  const future: string[] = [];
  for (let i = 1; i <= needed; i += 1) {
    future.push(addMonths(lastActual, i));
  }
  const months = [...sorted, ...future];
  return { months, editableStart: addMonths(lastActual, 1) };
}

export default function ForecastPanel({ actualMonths = [] }: Props) {
  const { months, editableStart } = useMemo(
    () => deriveMonths(actualMonths, MONTHS_TO_RENDER),
    [actualMonths]
  );
  const [rawRows, setRawRows] = useState<ForecastRow[]>(() =>
    buildInitialRows(months)
  );
  const [expanded] = useState<Set<string>>(new Set());
  const columns = useMemo(
    () =>
      buildForecastColumns(months, (row, key) => isCellEditable(row, key, editableStart), editableStart),
    [months, editableStart]
  );
  const monthColumns = useMemo(
    () => columns.filter((col) => col.kind === "month"),
    [columns]
  );
  const mapper = useMemo(() => new CoordinateMapper(monthColumns), [monthColumns]);
  const engineRef = useRef<HyperformulaAdapter | null>(null);

  useEffect(() => {
    const initial = buildInitialRows(months);
    setRawRows(initial);
    engineRef.current?.rebuild(initial);
  }, [months]);

  useEffect(() => {
    const engine = new HyperformulaAdapter(mapper);
    engine.rebuild(rawRows);
    const unsub = engine.onValuesUpdated((changes) => {
      setRawRows((prev) => {
        let updated = false;
        const next = [...prev];
        for (const change of changes) {
          const { rowIdx, colKey } = mapper.fromHFAddress(change.address);
          const target = next[rowIdx];
          if (!target) continue;
          const nextCells = { ...target.cells };
          const nextErrors = { ...(target.errors ?? {}) };
          if (change.value instanceof DetailedCellError) {
            nextCells[colKey] = null;
            nextErrors[colKey] =
              change.value.message || String(change.value.value || "Error");
          } else {
            if (typeof change.value === "number") {
              nextCells[colKey] = change.value;
            } else if (typeof change.value === "string") {
              const numeric = Number(change.value);
              nextCells[colKey] = Number.isNaN(numeric) ? null : numeric;
            } else {
              nextCells[colKey] = null;
            }
            nextErrors[colKey] = undefined;
          }
          if (
            nextCells[colKey] !== target.cells[colKey] ||
            nextErrors[colKey] !== target.errors?.[colKey]
          ) {
            next[rowIdx] = {
              ...target,
              cells: nextCells,
              errors: Object.values(nextErrors).some(Boolean)
                ? nextErrors
                : undefined,
            };
            updated = true;
          }
        }
        return updated ? next : prev;
      });
    });
    engineRef.current = engine;
    return () => {
      unsub();
      engine.destroy();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapper]);

  const visibleRows = useMemo(
    () => flattenForecastRows(rawRows, expanded),
    [rawRows, expanded]
  );

  useEffect(() => {
    engineRef.current?.rebuild(rawRows);
  }, [rawRows.length]);

  const updateRowCell = (
    prevRow: ForecastRow,
    rowIndex: number,
    colKey: string,
    value: unknown
  ) => {
    const { value: parsed, formula } = coerceInput(value);
    const nextCells = { ...prevRow.cells, [colKey]: parsed };
    const nextFormulas = { ...(prevRow.formulas ?? {}) };
    if (formula) {
      nextFormulas[colKey] = formula;
      engineRef.current?.setCellFormula(
        mapper.toHFAddress(rowIndex, colKey),
        formula
      );
    } else {
      if (nextFormulas[colKey]) delete nextFormulas[colKey];
      engineRef.current?.setCellValue(
        mapper.toHFAddress(rowIndex, colKey),
        parsed
      );
    }
    return {
      ...prevRow,
      cells: nextCells,
      formulas: Object.keys(nextFormulas).length ? nextFormulas : undefined,
      errors: undefined,
    };
  };

  const handleRowsChange = (
    nextRows: ForecastRow[],
    data: RowsChangeData<ForecastRow>
  ) => {
    if (!data.column) return;
    const colKey = data.column.key;
    if (colKey === "name") return;
    setRawRows((prev) => {
      if (!data.indexes) return prev;
      const byId = new Map(prev.map((r, idx) => [r.id, { row: r, idx }]));
      const updated = [...prev];
      for (const idx of data.indexes) {
        const changed = nextRows[idx];
        const match = byId.get(changed.id);
        if (!match) continue;
        const prevRow = match.row;
        updated[match.idx] = updateRowCell(
          prevRow,
          match.idx,
          colKey,
          changed.cells[colKey]
        );
      }
      return updated;
    });
  };

  const handleFill = (event: FillEvent<ForecastRow>) => {
    if (!isCellEditable(event.targetRow, event.columnKey, editableStart))
      return event.targetRow;
    if (!["kpi", "constant"].includes(event.targetRow.rowType)) {
      return event.targetRow;
    }
    const sourceFormula = event.sourceRow.formulas?.[event.columnKey];
    const sourceValue = event.sourceRow.cells[event.columnKey];
    const target = { ...event.targetRow };
    if (sourceFormula) {
      target.cells = { ...target.cells, [event.columnKey]: null };
      target.formulas = {
        ...(target.formulas ?? {}),
        [event.columnKey]: sourceFormula,
      };
    } else {
      const numeric =
        typeof sourceValue === "number" ? sourceValue : Number(sourceValue);
      target.cells = {
        ...target.cells,
        [event.columnKey]: Number.isNaN(numeric) ? null : numeric,
      };
      if (target.formulas?.[event.columnKey]) {
        const { [event.columnKey]: _, ...rest } = target.formulas;
        target.formulas = Object.keys(rest).length ? rest : undefined;
      }
    }
    return target;
  };

  const handlePaste = (
    args: { row: ForecastRow; column: { key: string } },
    event: React.ClipboardEvent<HTMLDivElement>
  ) => {
    const { row, column } = args;
    if (!isCellEditable(row, column.key, editableStart)) return row;
    const text = event.clipboardData.getData("text/plain");
    const { value, formula } = coerceInput(text);
    const next = { ...row, cells: { ...row.cells } };
    next.cells[column.key] = value;
    if (formula) {
      next.formulas = { ...(next.formulas ?? {}), [column.key]: formula };
    } else if (next.formulas?.[column.key]) {
      const { [column.key]: _, ...rest } = next.formulas;
      next.formulas = Object.keys(rest).length ? rest : undefined;
    }
    return next;
  };

  const handleCopy = (
    args: { row: ForecastRow; column: { key: string } },
    event: React.ClipboardEvent<HTMLDivElement>
  ) => {
    const { row, column } = args;
    const value =
      row.formulas?.[column.key] ??
      (row.cells[column.key] ?? "").toString();
    event.clipboardData.setData("text/plain", String(value));
    event.preventDefault();
  };

  return (
    <section className="space-y-3">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-base">資金繰り予測（ForecastPanel）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[520px]">
            <DataGrid
              rows={visibleRows}
              columns={columns}
              rowKeyGetter={(row) => row.id}
              defaultColumnOptions={defaultColumnOptions}
              onRowsChange={handleRowsChange}
              onFill={handleFill}
              onCellPaste={handlePaste}
              onCellCopy={handleCopy}
            />
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {`${editableStart} 以降のみ編集可能。計算行は HyperFormula で自動計算されます。`}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
