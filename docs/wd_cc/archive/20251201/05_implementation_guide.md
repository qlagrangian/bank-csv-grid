# 実装ガイド：融資管理機能と集計パネル拡張

## ドキュメント概要

本ドキュメントは、融資管理機能と集計パネル拡張の実装手順を詳細に記述します。4つのPhaseに分割し、各Phaseで独立した機能を完成させます。

## 実装前の確認事項

### 必読ファイル

実装を開始する前に、以下のファイルを必ず読んでください：

1. **prisma/schema.prisma** - Loanモデル追加の基準、既存モデルとの関係理解
2. **src/app/api/report/route.ts** - 期首残高・Loan統合の拡張ポイント、既存集計ロジックの理解
3. **src/components/AggregatePanel.tsx** - UI統合の中心、gridRows構築ロジックの変更箇所
4. **src/utils/reportGrid.tsx** - ReportRow型拡張、行構築関数の追加ポイント
5. **src/app/api/tags/route.ts** - タグ自動生成時の参考パターン

### 開発環境

- Node.js: 18以上
- PostgreSQL: 14以上
- npm: 8以上

### 環境変数

`.env`ファイルに以下を設定：
```
DATABASE_URL="postgresql://user:password@localhost:5432/bank_csv_grid"
```

---

## Phase 1: データベース・モデル（所要時間: 30分）

### ステップ1-1: Prismaスキーマ更新

**ファイル**: `prisma/schema.prisma`

**変更内容**:
```prisma
// 既存のモデル定義の後に追加
model Loan {
  id          String   @id @default(cuid())
  bank        String
  batchName   String
  amount      Float
  occurrenceYM String  // YYYY-MM
  tagId       String?
  memo        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([bank, batchName])
  @@index([bank])
  @@index([occurrenceYM])
  @@index([tagId])
}
```

**重要ポイント**:
- `@@unique([bank, batchName])`: 同銀行内で同名バッチは不可
- インデックス: 検索頻度の高いフィールドに設定

### ステップ1-2: マイグレーション実行

```bash
# マイグレーション作成
npx prisma migrate dev --name add_loan_model

# Prisma client再生成
npx prisma generate
```

**期待される結果**:
- `prisma/migrations/XXXXXX_add_loan_model/migration.sql`が作成される
- Prisma clientが再生成される
- `node_modules/.prisma/client/index.d.ts`に`Loan`型が追加される

### ステップ1-3: 動作確認

**テストスクリプト** (`scripts/test-loan-model.ts`):
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Loan作成テスト
  const loan = await prisma.loan.create({
    data: {
      bank: 'gmo',
      batchName: 'テスト融資',
      amount: 10000000,
      occurrenceYM: '2024-04',
    },
  });
  console.log('Created:', loan);

  // Unique制約テスト
  try {
    await prisma.loan.create({
      data: {
        bank: 'gmo',
        batchName: 'テスト融資',
        amount: 5000000,
        occurrenceYM: '2024-05',
      },
    });
  } catch (e: any) {
    if (e.code === 'P2002') {
      console.log('✓ Unique constraint works!');
    } else {
      throw e;
    }
  }

  // 削除
  await prisma.loan.delete({ where: { id: loan.id } });
  console.log('Deleted');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

実行:
```bash
npx tsx scripts/test-loan-model.ts
```

---

## Phase 2: API実装（所要時間: 3時間）

### ステップ2-1: 型定義作成

**ファイル**: `src/types/loan.ts`（新規作成）

```typescript
export interface LoanRow {
  id: string;
  bank: string;
  batchName: string;
  amount: number;
  occurrenceYM: string;  // YYYY-MM
  tagId?: string;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoanRequest {
  bank: string;
  batchName: string;
  amount: number;
  occurrenceYM: string;
}

export interface UpdateLoanRequest {
  amount?: number;
  occurrenceYM?: string;
}
```

### ステップ2-2: `/api/loans` 実装（GET/POST）

**ファイル**: `src/app/api/loans/route.ts`（新規作成）

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/loans
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bank = searchParams.get('bank');

  try {
    const where = bank ? { bank } : {};
    const loans = await prisma.loan.findMany({
      where,
      orderBy: [{ bank: 'asc' }, { occurrenceYM: 'asc' }],
    });

    return NextResponse.json(loans);
  } catch (error) {
    console.error('[API /loans GET]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/loans
export async function POST(req: NextRequest) {
  const { bank, batchName, amount, occurrenceYM } = await req.json();

  // バリデーション
  if (!bank || !batchName || !amount || !occurrenceYM) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}$/.test(occurrenceYM)) {
    return NextResponse.json({ error: 'Invalid occurrenceYM format' }, { status: 400 });
  }
  if (amount <= 0) {
    return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
  }

  try {
    // トランザクション: タグ生成 + Loan作成
    const loan = await prisma.$transaction(async (tx) => {
      // 1. 銀行タグ取得/作成
      let bankTag = await tx.tag.findFirst({
        where: { name: bank, parentId: null },
      });
      if (!bankTag) {
        bankTag = await tx.tag.create({
          data: { name: bank, parentId: null, order: 0 },
        });
      }

      // 2. 融資バッチタグ作成
      let batchTag;
      try {
        batchTag = await tx.tag.create({
          data: { name: batchName, parentId: bankTag.id, order: 0 },
        });
      } catch (e: any) {
        if (e.code === 'P2002') {
          // 重複: 既存タグを取得
          batchTag = await tx.tag.findFirst({
            where: { name: batchName, parentId: bankTag.id },
          });
        } else {
          throw e;
        }
      }

      // 3. Loan作成
      return tx.loan.create({
        data: { bank, batchName, amount, occurrenceYM, tagId: batchTag!.id },
      });
    });

    return NextResponse.json(loan, { status: 201 });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Loan already exists' }, { status: 409 });
    }
    console.error('[API /loans POST]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
```

### ステップ2-3: `/api/loans/[id]` 実装（PATCH/DELETE）

**ファイル**: `src/app/api/loans/[id]/route.ts`（新規作成）

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/loans/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { amount, occurrenceYM } = await req.json();

  const data: any = {};
  if (amount !== undefined) data.amount = amount;
  if (occurrenceYM !== undefined) {
    if (!/^\d{4}-\d{2}$/.test(occurrenceYM)) {
      return NextResponse.json({ error: 'Invalid occurrenceYM' }, { status: 400 });
    }
    data.occurrenceYM = occurrenceYM;
  }

  try {
    const loan = await prisma.loan.update({ where: { id }, data });
    return NextResponse.json(loan);
  } catch (e: any) {
    if (e.code === 'P2025') {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }
    console.error('[API /loans PATCH]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/loans/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({ where: { id } });
      if (!loan) throw new Error('Loan not found');

      // TagAssignment確認
      if (loan.tagId) {
        const assignCount = await tx.tagAssignment.count({
          where: { tagId: loan.tagId },
        });
        if (assignCount === 0) {
          // 未使用タグなら削除
          await tx.tag.delete({ where: { id: loan.tagId } });
        }
      }

      await tx.loan.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === 'Loan not found') {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }
    console.error('[API /loans DELETE]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
```

### ステップ2-4: report API拡張

**ファイル**: `src/types/report.ts`（既存）

**変更内容**:
```typescript
export interface ReportResponseMonthly {
  from: string | null;
  to: string | null;
  bank: string | null;
  mode: 'monthly';
  months: string[];
  tree: ReportNodeMonthly[];
  // 新規追加
  openingBalances: { [bank: string]: number[] };
  loans: {
    [bank: string]: {
      [batchName: string]: { amount: number; startIndex: number };
    };
  };
}
```

**ファイル**: `src/app/api/report/route.ts`（既存）

**変更内容** (GET関数の末尾に追加):
```typescript
// === 期首残高計算 ===
const openingBalances: { [bank: string]: number[] } = {};
const banks = [...new Set(assigns.map((a: any) => a.transaction.bank))];

for (const bank of banks) {
  const balances = new Array(months.length).fill(0);

  for (let i = 0; i < months.length; i++) {
    const [y, m] = months[i].split('-').map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);

    // 当月の最初のトランザクション
    const firstTx = await prisma.transaction.findFirst({
      where: {
        bank,
        date: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { date: 'asc' },
    });

    if (firstTx) {
      // LOGIC-01: 当月に取引あり
      if (firstTx.credit > 0) {
        balances[i] = (firstTx.balance ?? 0) - firstTx.credit;
      } else {
        balances[i] = (firstTx.balance ?? 0) + firstTx.debit;
      }
    } else {
      // LOGIC-03: 当月に取引なし → 前月以前の最後の取引
      const lastTx = await prisma.transaction.findFirst({
        where: {
          bank,
          date: { lt: monthStart },
        },
        orderBy: { date: 'desc' },
      });

      balances[i] = lastTx?.balance ?? 0;
    }
  }

  openingBalances[bank] = balances;
}

// === Loan取得・整形 ===
const loansFromDB = await prisma.loan.findMany();
const loansByBank: {
  [bank: string]: {
    [batchName: string]: { amount: number; startIndex: number };
  };
} = {};

for (const loan of loansFromDB) {
  if (!loansByBank[loan.bank]) loansByBank[loan.bank] = {};

  const startIndex = months.indexOf(loan.occurrenceYM);
  loansByBank[loan.bank][loan.batchName] = {
    amount: loan.amount,
    startIndex: startIndex >= 0 ? startIndex : -1,
  };
}

// === レスポンス拡張 ===
return NextResponse.json({
  from: fromYMD ? startOfDayLocal(fromYMD).toISOString() : null,
  to: toYMD ? endOfDayLocal(toYMD).toISOString() : null,
  bank: bank ?? null,
  mode,
  months,
  tree,
  openingBalances, // 追加
  loans: loansByBank, // 追加
});
```

### ステップ2-5: API動作確認

**curlテスト**:
```bash
# GET /api/loans
curl http://localhost:3000/api/loans

# POST /api/loans
curl -X POST http://localhost:3000/api/loans \
  -H "Content-Type: application/json" \
  -d '{"bank":"gmo","batchName":"テスト融資","amount":10000000,"occurrenceYM":"2024-04"}'

# GET /api/report (拡張確認)
curl http://localhost:3000/api/report | jq '.openingBalances, .loans'
```

---

## Phase 3: UI実装（所要時間: 4時間）

### ステップ3-1: Navigation（サイドメニュー）

**ファイル**: `src/components/Navigation.tsx`（新規作成）

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "取引管理" },
    { href: "/dashboard", label: "融資管理" },
  ];

  return (
    <nav className="w-64 bg-gray-100 border-r h-full p-4">
      <h2 className="text-lg font-bold mb-4">メニュー</h2>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className={`block px-4 py-2 rounded ${
                pathname === link.href
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-200"
              }`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

**ファイル**: `src/app/layout.tsx`（既存、変更）

```typescript
import { Navigation } from "@/components/Navigation";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={inter.variable}>
      <body>
        <ToastProvider>
          <div className="flex h-screen">
            <Navigation />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
```

### ステップ3-2: Loan関連コンポーネント

**ファイル**: `src/hooks/useLoans.ts`（新規作成）

```typescript
import useSWR from "swr";
import { LoanRow } from "@/types/loan";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useLoans() {
  const { data, error, mutate } = useSWR<LoanRow[]>("/api/loans", fetcher);

  const deleteLoan = async (id: string) => {
    const res = await fetch(`/api/loans/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    mutate();
  };

  return {
    loans: data ?? [],
    isLoading: !error && !data,
    error,
    refresh: mutate,
    deleteLoan,
  };
}
```

**ファイル**: `src/components/LoanForm.tsx`（新規作成）

```typescript
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BankSelect from "@/components/BankSelect";

export function LoanForm({ onSuccess }: { onSuccess: () => void }) {
  const [bank, setBank] = useState("gmo");
  const [batchName, setBatchName] = useState("");
  const [amount, setAmount] = useState("");
  const [occurrenceYM, setOccurrenceYM] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank,
          batchName,
          amount: parseFloat(amount),
          occurrenceYM,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.error}`);
        return;
      }

      // フォームリセット
      setBatchName("");
      setAmount("");
      setOccurrenceYM("");
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium">銀行</label>
        <BankSelect value={bank} onChange={setBank} />
      </div>
      <div>
        <label className="block text-sm font-medium">融資バッチ名</label>
        <Input
          value={batchName}
          onChange={(e) => setBatchName(e.target.value)}
          placeholder="例: 2024年春季融資"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium">融資額</label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="10000000"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium">発生年月</label>
        <Input
          type="month"
          value={occurrenceYM}
          onChange={(e) => setOccurrenceYM(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "登録中…" : "融資登録"}
      </Button>
    </form>
  );
}
```

**ファイル**: `src/utils/loanGrid.tsx`（新規作成）

```typescript
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
```

**ファイル**: `src/components/LoanPanel.tsx`（新規作成）

```typescript
"use client";

import { useMemo } from "react";
import DataGrid from "react-data-grid";
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
```

**ファイル**: `src/app/dashboard/page.tsx`（新規作成）

```typescript
"use client";

import { LoanForm } from "@/components/LoanForm";
import { LoanPanel } from "@/components/LoanPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">融資管理ダッシュボード</h1>

      <Card>
        <CardHeader>
          <CardTitle>新規融資登録</CardTitle>
        </CardHeader>
        <CardContent>
          <LoanForm onSuccess={() => window.location.reload()} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>融資一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <LoanPanel />
        </CardContent>
      </Card>
    </div>
  );
}
```

### ステップ3-3: AggregatePanel拡張

**ファイル**: `src/utils/reportGrid.tsx`（既存、拡張）

**変更内容**:
```typescript
// ReportRow型にフラグ追加
export interface ReportRow {
  id: string;
  name: string;
  depth: number;
  childrenCount: number;
  expanded: boolean;
  monthlyNet: number[];
  netTotal: number;
  isTotalRow?: boolean;
  isOpeningBalanceRow?: boolean;      // 新規
  isLoanRow?: boolean;                // 新規
  isCumulativeCashRow?: boolean;      // 新規
}

// 期首残高行の構築
export function buildOpeningBalanceRows(
  openingBalances: { [bank: string]: number[] },
  months: string[]
): ReportRow[] {
  return Object.entries(openingBalances).map(([bank, balances]) => ({
    id: `__opening_${bank}__`,
    name: `${bank} 期首残高`,
    depth: 0,
    childrenCount: 0,
    expanded: false,
    monthlyNet: balances,
    netTotal: balances.reduce((a, b) => a + b, 0),
    isOpeningBalanceRow: true,
  }));
}

// 借入残高行の構築
export function buildLoanRows(
  loans: {
    [bank: string]: {
      [batchName: string]: { amount: number; startIndex: number };
    };
  },
  months: string[]
): ReportRow[] {
  const rows: ReportRow[] = [];

  Object.entries(loans).forEach(([bank, batches]) => {
    Object.entries(batches).forEach(([batchName, { amount, startIndex }]) => {
      const monthlyNet = months.map((_, i) =>
        i >= startIndex && startIndex >= 0 ? amount : 0
      );

      rows.push({
        id: `__loan_${bank}_${batchName}__`,
        name: `${bank} > ${batchName}`,
        depth: 0,
        childrenCount: 0,
        expanded: false,
        monthlyNet,
        netTotal: monthlyNet.reduce((a, b) => a + b, 0),
        isLoanRow: true,
      });
    });
  });

  return rows;
}

// 借入合計行
export function buildLoanTotalRow(loanRows: ReportRow[]): ReportRow {
  const monthlyNet = loanRows[0]?.monthlyNet.map((_, i) =>
    loanRows.reduce((sum, row) => sum + row.monthlyNet[i], 0)
  ) ?? [];

  return {
    id: '__loan_total__',
    name: '借入合計',
    depth: 0,
    childrenCount: 0,
    expanded: false,
    monthlyNet,
    netTotal: monthlyNet.reduce((a, b) => a + b, 0),
    isLoanRow: true,
  };
}

// 累積営業ネットキャッシュ行
export function buildCumulativeCashRow(
  monthlyTotals: number[],
  loanTotals: number[]
): ReportRow {
  const monthlyNet = monthlyTotals.map((total, i) => total - (loanTotals[i] ?? 0));

  return {
    id: '__cumulative_cash__',
    name: '累積営業ネットキャッシュ',
    depth: 0,
    childrenCount: 0,
    expanded: false,
    monthlyNet,
    netTotal: monthlyNet.reduce((a, b) => a + b, 0),
    isCumulativeCashRow: true,
  };
}
```

**ファイル**: `src/components/AggregatePanel.tsx`（既存、変更）

**変更内容** (gridRows構築ロジック):
```typescript
const gridRows = useMemo<ReportRow[]>(() => {
  if (!data) return [];

  // 期首残高行
  const openingRows = buildOpeningBalanceRows(
    data.openingBalances ?? {},
    data.months
  );

  // 既存のタグ階層
  const rows = flattenVisibleMonthly(data.tree, expanded, toggle, data.months, 0);

  // 月合計行
  const monthlyTotals = data.months.map((_, i) =>
    rows.reduce((sum, row) => sum + row.monthlyNet[i], 0)
  );
  const totalRow = {
    id: "__monthly_total__",
    name: "月合計",
    depth: 0,
    childrenCount: 0,
    expanded: false,
    monthlyNet: monthlyTotals,
    netTotal: monthlyTotals.reduce((a, b) => a + b, 0),
    isTotalRow: true,
  };

  // 借入残高行群
  const loanRows = buildLoanRows(data.loans ?? {}, data.months);
  const loanTotalRow = buildLoanTotalRow(loanRows);

  // 累積営業ネットキャッシュ行
  const cumulativeCashRow = buildCumulativeCashRow(
    monthlyTotals,
    loanTotalRow.monthlyNet
  );

  return [
    ...openingRows,      // 最上段
    ...rows,             // タグ階層
    totalRow,            // 月合計
    ...loanRows,         // 借入行群
    loanTotalRow,        // 借入合計
    cumulativeCashRow,   // 累積ネット（最終行）
  ];
}, [data, expanded, toggle]);
```

**buildReportColumnsDepth関数のrenderCell拡張**:
```typescript
renderCell: ({ row }: { row: ReportRow }) => {
  // 期首残高行のスタイル
  if (row.isOpeningBalanceRow) {
    return (
      <span className="font-semibold bg-yellow-50 px-2 py-1 rounded">
        {row.name}
      </span>
    );
  }

  // 借入残高行のスタイル
  if (row.isLoanRow) {
    return (
      <span className="font-semibold text-blue-700">
        {row.name}
      </span>
    );
  }

  // 累積ネットキャッシュ行のスタイル
  if (row.isCumulativeCashRow) {
    return (
      <span className="font-bold text-green-700">
        {row.name}
      </span>
    );
  }

  // 既存ロジック
  // ...
}
```

---

## Phase 4: 統合・テスト（所要時間: 2時間）

### ステップ4-1: 期首残高計算テスト

**テストケース**:
1. 当月に取引がある銀行（入金/出金）
2. 当月に取引がない銀行（前月データあり）
3. 全く取引がない銀行（期首残高=0）

**手順**:
```bash
# 開発サーバー起動
npm run dev

# ブラウザで http://localhost:3000 を開く
# 集計パネルの最上段に期首残高行が表示されることを確認
```

### ステップ4-2: 融資登録・削除フロー

**テストケース**:
1. 新規融資登録 → タグ自動生成確認
2. 同銀行で複数融資登録 → 銀行タグ共有確認
3. 融資削除（未使用タグ） → タグも削除
4. 融資削除（使用中タグ） → タグは残存

**手順**:
```bash
# ダッシュボードページを開く
http://localhost:3000/dashboard

# 融資登録フォームでテストデータを入力
# 登録後、タグマスターで自動生成されたタグを確認
```

### ステップ4-3: 集計パネル統合表示

**テストケース**:
1. 期首残高行が最上段に表示
2. 借入残高行が正しい月から表示（発生月以前は0）
3. 累積営業ネットキャッシュ = 月合計 - 借入合計

**手順**:
```bash
# 取引管理ページで集計パネルを確認
http://localhost:3000

# 期首残高行、借入行群、累積ネット行の表示を確認
```

### ステップ4-4: パフォーマンステスト

**計測ツール**: Chrome DevTools Network タブ

**目標**:
- report APIのレスポンスタイム: 1秒未満
- グリッド描画: 1秒未満

**手順**:
```bash
# Network タブで /api/report のレスポンスタイムを確認
# Performance タブでグリッド描画時間を確認
```

---

## トラブルシューティング

### 問題: Prismaマイグレーションが失敗する

**原因**: データベース接続エラー

**解決策**:
```bash
# データベースが起動しているか確認
psql -U postgres -c "SELECT version();"

# DATABASE_URLが正しいか確認
echo $DATABASE_URL
```

### 問題: タグ自動生成で409エラー

**原因**: 同銀行・同バッチ名の融資が既に存在

**解決策**:
```bash
# 既存のLoanレコードを確認
curl http://localhost:3000/api/loans | jq '.[] | select(.bank == "gmo")'

# 必要に応じて削除
curl -X DELETE http://localhost:3000/api/loans/{id}
```

### 問題: 期首残高が0になる

**原因**: Transactionデータが存在しない、またはbalanceフィールドがnull

**解決策**:
```bash
# Transactionデータを確認
psql -U postgres -d bank_csv_grid -c "SELECT bank, date, balance FROM \"Transaction\" LIMIT 10;"

# CSVインポートを再実行
```

---

## 次のステップ

### 実装完了後

1. **全機能のテスト**: 各Phaseの動作確認
2. **コードレビュー**: 実装の品質確認
3. **ドキュメント更新**: README.mdに新機能を追記
4. **デプロイ**: 本番環境へのデプロイ

### 将来の拡張

- 返済処理の自動化（タグ付けベースの集計）
- 期首残高の手動入力機能
- 融資返済スケジュールの管理
- レポートのPDF出力

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-12-02 | 1.0 | 初版作成 |
