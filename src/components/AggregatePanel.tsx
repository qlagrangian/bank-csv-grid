"use client";

import BankSelect from "@/components/BankSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ReportResponseMonthly } from "@/types/report";
import {
  buildReportColumnsDepth,
  computeMaxDepth,
  flattenVisibleMonthly,
  ReportRow,
} from "@/utils/reportGrid";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DataGrid } from "react-data-grid";

// 旧実装の単一列集計型は不要になった

export default function AggregatePanel() {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [bank, setBank] = useState<
    "paypay" | "gmo" | "sbi" | "mizuhoebiz" | "mizuhobizweb" | "all"
  >("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReportResponseMonthly | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (bank && bank !== "all") params.set("bank", bank);
      const qs = params.toString();
      const url = qs ? `/api/report?${qs}` : "/api/report";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`failed: ${res.status}`);
      const json: ReportResponseMonthly = await res.json();
      setData(json);
      // 初回は第1階層だけ展開
      const next = new Set<string>();
      (json.tree || []).forEach((n) => next.add(n.id));
      setExpanded(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }, [from, to, bank]);

  useEffect(() => {
    // 初期ロード
    fetchReport();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // フィルタ変更で自動再取得
    fetchReport();
  }, [from, to, bank, fetchReport]);

  const rows = useMemo<ReportRow[]>(() => {
    if (!data) return [];
    return flattenVisibleMonthly(data.tree, expanded);
  }, [data, expanded]);

  // 月次合計行を計算（階層合計ではなく months 列ごとの全ノード net 和）
  const monthlyTotals = useMemo(() => {
    if (!data) return [] as number[];
    const len = data.months.length;
    const sums = Array(len).fill(0);
    function walk(nodes: any[]) {
      for (const n of nodes) {
        n.monthly.forEach((m: any, idx: number) => {
          sums[idx] += (m.credit ?? 0) - (m.debit ?? 0);
        });
        if (n.children?.length) walk(n.children);
      }
    }
    walk(data.tree);
    return sums;
  }, [data]);

  function toggle(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  }
  function expandAll() {
    const all = new Set<string>();
    collectIds((data?.tree ?? []) as any, all);
    setExpanded(all);
  }
  function collapseAll() {
    setExpanded(new Set());
  }

  const months = data?.months ?? [];
  const maxDepth = useMemo(() => computeMaxDepth(rows), [rows]);
  const columns = useMemo(
    () => buildReportColumnsDepth(months, maxDepth, toggle),
    [months, maxDepth, expanded]
  );

  // DataGrid 行 + 月合計行 (最後)
  const gridRows = useMemo<ReportRow[]>(() => {
    if (!data) return [];
    return [
      ...rows,
      {
        id: "__monthly_total__",
        name: "月合計",
        depth: 0,
        childrenCount: 0,
        expanded: false,
        monthlyNet: monthlyTotals,
        netTotal: monthlyTotals.reduce((a, b) => a + b, 0),
        isTotalRow: true,
      },
    ];
  }, [rows, monthlyTotals, data]);

  // console.log({ data, rows });

  return (
    <section className="space-y-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">集計レポート</CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={fetchReport} disabled={loading}>
              {loading ? "更新中…" : "更新"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-gray-600">From</span>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-gray-600">To</span>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-gray-600">銀行</span>
              <div className="w-48">
                <BankSelect
                  value={bank as any}
                  onChange={(v) => setBank(v as any)}
                />
              </div>
            </label>
            <div className="flex items-center gap-2 ml-auto">
              <Button variant="secondary" onClick={expandAll}>
                全展開
              </Button>
              <Button variant="secondary" onClick={collapseAll}>
                全折りたたみ
              </Button>
            </div>
          </div>
          {/* 現在の条件／APIエコー */}
          {/* <div className="mt-2 text-xs text-gray-500 space-x-3">
            <span>
              条件: from={from || "-"} to={to || "-"} bank={bank || "-"}
            </span>
            {data && (
              <span>
                API: from={data.from ?? "-"} to={data.to ?? "-"} bank=
                {data.bank ?? "-"}
              </span>
            )}
          </div> */}
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-red-600">エラー</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">結果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-[520px] border rounded overflow-hidden">
              <DataGrid
                columns={columns}
                rows={gridRows}
                rowKeyGetter={(r: ReportRow) => r.id}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function formatYen(n: number) {
  return (n ?? 0).toLocaleString("ja-JP");
}

function collectIds(nodes: any[], out: Set<string>) {
  for (const n of nodes) {
    if (!n) continue;
    out.add(n.id);
    if (Array.isArray(n.children)) collectIds(n.children, out);
  }
}

// 旧テーブル描画補助関数は不要になったため削除

function formatSignedYen(n: number) {
  const abs = Math.abs(n).toLocaleString("ja-JP");
  if (n === 0) return "0";
  return n < 0 ? `-${abs}` : abs;
}
