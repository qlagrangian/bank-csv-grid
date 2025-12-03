import type { Column, RenderCellProps } from "react-data-grid";
import clsx from "clsx";
import type { ForecastColumn, ForecastRow } from "@/types/forecast";

export const DEFAULT_FORECAST_START_DATE = "2025-01-01";

function monthKey(key: string) {
  return key.startsWith("m_") ? key.replace("m_", "") : key;
}

function monthKeyToDate(key: string) {
  return new Date(`${monthKey(key)}-01`);
}

export function isCellEditable(
  row: ForecastRow,
  colKey: string,
  startDate: string = DEFAULT_FORECAST_START_DATE
) {
  if (!colKey.startsWith("m_")) return false;
  if (["formula", "subtotal", "total", "opening"].includes(row.rowType)) {
    return false;
  }
  const cellDate = monthKeyToDate(colKey);
  return cellDate >= new Date(startDate);
}

function renderValueCell(
  startDate: string
): (props: RenderCellProps<ForecastRow>) => JSX.Element {
  return ({ row, column }: RenderCellProps<ForecastRow>) => {
  const key = column.key;
  const value = row.cells[key];
  const error = row.errors?.[key];
  const hasError = Boolean(error);
    const isPast =
      key.startsWith("m_") && monthKeyToDate(key) < new Date(startDate);
  const isNegative = typeof value === "number" && value < 0;

  const base = clsx(
    "h-full w-full px-2 flex items-center justify-end text-sm",
    {
      "bg-blue-50": row.rowType === "formula",
      "bg-amber-50": row.rowType === "constant",
      "bg-yellow-50": row.rowType === "opening",
      "text-red-600": isNegative,
      "text-gray-400 bg-gray-50": isPast,
      "bg-red-50 text-red-700": hasError,
    }
  );

    return (
      <div className={base} title={error}>
        {error ?? (typeof value === "number" ? value.toLocaleString() : value)}
      </div>
    );
  };
}

export function buildForecastColumns(
  months: string[],
  editable: (row: ForecastRow, colKey: string) => boolean,
  startDate: string
): Array<ForecastColumn & Column<ForecastRow>> {
  const columns: Array<ForecastColumn & Column<ForecastRow>> = [
    {
      key: "name",
      name: "項目",
      kind: "label",
      width: 200,
      frozen: true,
      resizable: true,
      editable: false,
      renderCell: ({ row }) => (
        <div
          className={clsx("flex items-center gap-2 px-2 py-1", {
            "bg-blue-50": row.rowType === "formula",
            "bg-amber-50": row.rowType === "constant",
            "bg-yellow-50": row.rowType === "opening",
          })}
        >
          <span style={{ paddingLeft: row.depth * 12 }} className="font-medium">
            {row.name}
          </span>
        </div>
      ),
    },
  ];

  const monthCols: Array<ForecastColumn & Column<ForecastRow>> = months.map(
    (m) => {
      const key = `m_${m}`;
      return {
        key,
        name: m,
        kind: "month",
        width: 110,
        resizable: true,
        editable: (row) => editable(row, key),
        renderCell: renderValueCell(startDate),
      } as ForecastColumn & Column<ForecastRow>;
    }
  );

  columns.push(...monthCols);
  return columns;
}

export function flattenForecastRows(
  rawRows: ForecastRow[],
  expanded: Set<string>,
  depth = 0,
  parentExpanded = true
): ForecastRow[] {
  const out: ForecastRow[] = [];
  for (const row of rawRows) {
    const isRoot = depth === 0;
    const visible = isRoot || parentExpanded;
    if (!visible) continue;
    const childrenCount = row.children?.length ?? 0;
    const isExpanded = expanded.has(row.id);
    out.push({
      ...row,
      depth,
      childrenCount,
      expanded: isExpanded,
    });
    if (row.children?.length) {
      out.push(
        ...flattenForecastRows(row.children, expanded, depth + 1, isExpanded)
      );
    }
  }
  return out;
}
