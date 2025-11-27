"use client";
import { ReportNodeMonthly } from "@/types/report";
import { Column } from "react-data-grid";

export interface ReportRow {
  id: string;
  name: string;
  depth: number;
  childrenCount: number;
  expanded: boolean;
  monthlyNet: number[]; // months 順の net(credit - debit)
  // netTotal は UI では使わないが内部集計用に保持可能
  netTotal: number;
  isTotalRow?: boolean; // 月合計行フラグ
}

export function flattenVisibleMonthly(
  nodes: ReportNodeMonthly[],
  expanded: Set<string>,
  depth = 0,
  parentExpanded = true
): ReportRow[] {
  const out: ReportRow[] = [];
  for (const n of nodes) {
    const isRoot = depth === 0;
    const visible = isRoot || parentExpanded;
    if (!visible) continue;
    const monthlyNet = n.monthly.map((s) => (s.credit ?? 0) - (s.debit ?? 0));
    const netTotal = (n.credit ?? 0) - (n.debit ?? 0);
    out.push({
      id: n.id,
      name: n.name,
      depth,
      childrenCount: n.children?.length ?? 0,
      expanded: expanded.has(n.id),
      monthlyNet,
      netTotal,
    });
    const childParentExpanded = expanded.has(n.id);
    if (n.children?.length) {
      out.push(
        ...flattenVisibleMonthly(
          n.children,
          expanded,
          depth + 1,
          childParentExpanded
        )
      );
    }
  }
  return out;
}

// 階層列レイアウト: depth 個の列を生成し、該当 depth でのみ名前 + トグルを表示

export function computeMaxDepth(rows: ReportRow[]): number {
  return rows.reduce((m, r) => Math.max(m, r.depth), 0);
}

export function buildReportColumnsDepth(
  months: string[],
  maxDepth: number,
  toggle: (id: string) => void
): Column<ReportRow>[] {
  const depthCols: Column<ReportRow>[] = Array.from(
    { length: maxDepth + 1 },
    (_, depth) => ({
      key: `lvl_${depth}`,
      name: depth === 0 ? "タグ" : "",
      width: 160,
      resizable: true,
      renderCell: ({ row }) => {
        if (row.isTotalRow) {
          // 合計行は最左列にラベル
          if (depth === 0) return <span className="font-semibold">月合計</span>;
          return null;
        }
        if (row.depth !== depth) return null;
        const canExpand = row.childrenCount > 0;
        return (
          <div className="flex items-center">
            {/* depth 列なのでインデント不要 */}
            {canExpand && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(row.id);
                }}
                className="w-5 h-5 mr-1 rounded hover:bg-gray-100 border text-xs flex items-center justify-center"
                aria-label={row.expanded ? "折りたたむ" : "展開"}
              >
                {row.expanded ? "-" : "+"}
              </button>
            )}
            {!canExpand && <span className="w-5 h-5 mr-1" />}
            <span className={row.childrenCount > 0 ? "font-semibold" : ""}>
              {row.name}
            </span>
          </div>
        );
      },
    })
  );

  const monthCols: Column<ReportRow>[] = months.map((m, idx) => ({
    key: `m_${idx}`,
    name: m,
    width: 110,
    resizable: true,
    renderCell: ({ row }) => {
      const v = row.monthlyNet[idx];
      const cls = row.isTotalRow ? "font-semibold" : "";
      return (
        <span className={netColorCls(v) + " " + cls}>{formatSignedYen(v)}</span>
      );
    },
  }));
  return [...depthCols, ...monthCols];
}

function netColorCls(v: number) {
  if (v < 0) return "text-red-600";
  if (v > 0) return "text-green-700";
  return "text-gray-600";
}

function formatSignedYen(n: number) {
  const abs = Math.abs(n).toLocaleString("ja-JP");
  if (n === 0) return "0";
  return n < 0 ? `-${abs}` : abs;
}
