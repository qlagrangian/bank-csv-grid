import {
  flattenForecastRows,
  DEFAULT_FORECAST_START_DATE as FORECAST_START_DATE,
  isCellEditable,
} from "./forecastGrid";
import type { ForecastRow } from "@/types/forecast";

describe("isCellEditable", () => {
  const baseRow: ForecastRow = {
    id: "kpi",
    name: "KPI",
    rowType: "kpi",
    depth: 0,
    cells: { "m_2024-12": null, "m_2025-01": null },
  };

  it("allows future months", () => {
    expect(isCellEditable(baseRow, "m_2025-01", FORECAST_START_DATE)).toBe(
      true
    );
  });

  it("locks past months", () => {
    expect(isCellEditable(baseRow, "m_2024-12", FORECAST_START_DATE)).toBe(
      false
    );
  });

  it("keeps formula rows read-only", () => {
    const formulaRow = { ...baseRow, rowType: "formula" as const };
    expect(isCellEditable(formulaRow, "m_2025-02")).toBe(false);
  });
});

describe("flattenForecastRows", () => {
  const rows: ForecastRow[] = [
    {
      id: "root",
      name: "Root",
      rowType: "kpi",
      depth: 0,
      cells: {},
      children: [
        {
          id: "child",
          name: "Child",
          rowType: "kpi",
          depth: 1,
          cells: {},
        },
      ],
    },
  ];

  it("hides children when collapsed", () => {
    const flat = flattenForecastRows(rows, new Set());
    expect(flat.map((r) => r.id)).toEqual(["root"]);
  });

  it("expands children when parent expanded", () => {
    const flat = flattenForecastRows(rows, new Set(["root"]));
    expect(flat.map((r) => r.id)).toEqual(["root", "child"]);
    expect(flat[1].depth).toBe(1);
  });
});
