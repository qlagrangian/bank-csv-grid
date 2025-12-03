import { Column } from "react-data-grid";
import { LoanRow } from "@/types/loan";

interface LoanGridRow {
  id: string;
  bank: string;
  batchName: string;
  monthlyAmounts: (number | null)[];
}

export function buildLoanGridRows(loans: LoanRow[]): {
  rows: LoanGridRow[];
  months: string[];
} {
  const monthSet = new Set(loans.map((l) => l.occurrenceYM));
  const months = Array.from(monthSet).sort();

  const rows: LoanGridRow[] = loans.map((loan) => {
    const startIndex = months.indexOf(loan.occurrenceYM);
    const monthlyAmounts = months.map((_, i) =>
      i >= startIndex ? loan.amount : null
    );

    return {
      id: loan.id,
      bank: loan.bank,
      batchName: loan.batchName,
      monthlyAmounts,
    };
  });

  return { rows, months };
}

export function buildLoanGridColumns(
  months: string[],
  onDelete: (id: string) => void
): Column<LoanGridRow>[] {
  return [
    {
      key: "bank",
      name: "銀行",
      width: 120,
    },
    {
      key: "batchName",
      name: "融資バッチ",
      width: 200,
    },
    ...months.map((m, i) => ({
      key: `month_${i}`,
      name: m,
      width: 110,
      renderCell: ({ row }: { row: LoanGridRow }) => {
        const amt = row.monthlyAmounts[i];
        return amt !== null ? amt.toLocaleString("ja-JP") : "-";
      },
    })),
    {
      key: "actions",
      name: "操作",
      width: 80,
      renderCell: ({ row }: { row: LoanGridRow }) => (
        <button
          onClick={() => {
            if (confirm("この融資を削除しますか？")) {
              onDelete(row.id);
            }
          }}
          className="text-red-600 text-sm"
        >
          削除
        </button>
      ),
    },
  ];
}
