"use client";

import { useMemo } from "react";
import { DataGrid } from "react-data-grid";
import { useLoans } from "@/hooks/useLoans";
import { buildLoanGridColumns, buildLoanGridRows } from "@/utils/loanGrid";

export function LoanPanel() {
  const { loans, isLoading, refresh, deleteLoan } = useLoans();

  const { rows, months } = useMemo(() => {
    return buildLoanGridRows(loans);
  }, [loans]);

  const columns = useMemo(() => {
    return buildLoanGridColumns(months, deleteLoan);
  }, [months, deleteLoan]);

  if (isLoading) return <p>読み込み中…</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">融資額パネル</h2>
      <div className="h-[400px] border rounded overflow-hidden">
        <DataGrid columns={columns} rows={rows} />
      </div>
    </div>
  );
}
