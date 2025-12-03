import { HyperformulaAdapter } from "./hyperformulaAdapter";
import { CoordinateMapper } from "./coordinateMapper";
import type { ForecastColumn, ForecastRow } from "@/types/forecast";

const monthCols: ForecastColumn[] = [
  { key: "m_2025-01", name: "2025-01", kind: "month" },
  { key: "m_2025-02", name: "2025-02", kind: "month" },
];

describe("HyperformulaAdapter", () => {
  it("calculates formulas and emits value updates", () => {
    const mapper = new CoordinateMapper(monthCols);
    const engine = new HyperformulaAdapter(mapper);
    const rows: ForecastRow[] = [
      {
        id: "kpi",
        name: "KPI",
        rowType: "kpi",
        depth: 0,
        cells: { "m_2025-01": null, "m_2025-02": null },
      },
      {
        id: "calc",
        name: "Calc",
        rowType: "formula",
        depth: 0,
        cells: { "m_2025-01": null, "m_2025-02": null },
        formulas: {
          "m_2025-01": "=A0*2",
          "m_2025-02": "=B0*3",
        },
      },
    ];

    engine.rebuild(rows);
    const updates: { address: any; value: any }[] = [];
    const off = engine.onValuesUpdated((changes) => updates.push(...changes));

    engine.setCellValue(mapper.toHFAddress(0, "m_2025-01"), 10);
    engine.setCellValue(mapper.toHFAddress(0, "m_2025-02"), 5);

    expect(engine.getCellValue(mapper.toHFAddress(1, "m_2025-01"))).toBe(20);
    expect(engine.getCellValue(mapper.toHFAddress(1, "m_2025-02"))).toBe(15);
    expect(
      updates.some(
        (c) => c.address.row === 1 && c.address.col === 0 && c.value === 20
      )
    ).toBe(true);

    off();
    engine.destroy();
  });
});
