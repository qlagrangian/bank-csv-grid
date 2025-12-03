import { CoordinateMapper } from "./coordinateMapper";
import type { ForecastColumn } from "@/types/forecast";

const columns: ForecastColumn[] = [
  { key: "m_2025-01", name: "2025-01", kind: "month" },
  { key: "m_2025-02", name: "2025-02", kind: "month" },
  { key: "m_2025-03", name: "2025-03", kind: "month" },
];

describe("CoordinateMapper", () => {
  it("maps keys to addresses", () => {
    const mapper = new CoordinateMapper(columns);
    expect(mapper.toHFAddress(2, "m_2025-02")).toEqual({
      sheet: 0,
      row: 2,
      col: 1,
    });
    expect(
      mapper.fromHFAddress({ sheet: 0, row: 1, col: 0 }).colKey
    ).toBe("m_2025-01");
  });

  it("returns column labels and keys", () => {
    const mapper = new CoordinateMapper(columns);
    expect(mapper.columnLabel("m_2025-03")).toBe("C");
    expect(mapper.columnKeys()).toEqual([
      "m_2025-01",
      "m_2025-02",
      "m_2025-03",
    ]);
  });
});
