# アーキテクチャ設計：融資管理機能と集計パネル拡張

## ドキュメント概要

本ドキュメントは、融資管理機能と集計パネル拡張のアーキテクチャ設計を記述します。データモデル、データフロー、コンポーネント構成を含みます。

## システムアーキテクチャ

### レイヤー構成

```
┌─────────────────────────────────────────┐
│         UI Layer (React Components)     │
│  AggregatePanel, LoanForm, LoanPanel   │
└───────────────┬─────────────────────────┘
                │ fetch() / SWR
┌───────────────▼─────────────────────────┐
│      API Layer (Next.js API Routes)     │
│  /api/report, /api/loans, /api/loans/[id]│
└───────────────┬─────────────────────────┘
                │ Prisma Client
┌───────────────▼─────────────────────────┐
│      Data Layer (PostgreSQL + Prisma)   │
│  Transaction, Tag, TagAssignment, Loan  │
└─────────────────────────────────────────┘
```

### データフロー

#### 期首残高の計算フロー

```
┌──────────────┐
│ AggregatePanel│
│ (Component)  │
└──────┬───────┘
       │ fetchReport()
       ▼
┌──────────────────────────────────────────┐
│ GET /api/report?from=...&to=...&bank=... │
└──────┬───────────────────────────────────┘
       │
       ├─→ prisma.transaction.findFirst()  ← 当月最初の取引
       │   (ORDER BY date ASC, LIMIT 1)
       │
       ├─→ prisma.transaction.findFirst()  ← 前月以前の最後の取引
       │   (ORDER BY date DESC, LIMIT 1)
       │
       ▼
┌──────────────────────────────────────────┐
│ 期首残高計算ロジック                      │
│  - 入金: balance - credit                │
│  - 出金: balance + debit                 │
│  - 繰越: 前月balance                     │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ ReportResponseMonthly                    │
│  openingBalances: { [bank]: number[] }   │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ AggregatePanel                           │
│  期首残高行を最上段に表示                │
└──────────────────────────────────────────┘
```

#### 融資登録のフロー

```
┌──────────────┐
│  LoanForm    │
│ (Component)  │
└──────┬───────┘
       │ POST /api/loans
       ▼
┌────────────────────────────────────────────┐
│ POST /api/loans                            │
│  { bank, batchName, amount, occurrenceYM } │
└──────┬─────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│ prisma.$transaction() 開始                 │
└──────┬─────────────────────────────────────┘
       │
       ├─→ 銀行タグを検索/作成
       │   prisma.tag.findFirst({ name: bank, parentId: null })
       │   存在しない場合: prisma.tag.create()
       │
       ├─→ 融資バッチタグを作成
       │   prisma.tag.create({ name: batchName, parentId: 銀行タグID })
       │   重複の場合: 既存タグを取得
       │
       ├─→ Loanレコードを作成
       │   prisma.loan.create({ bank, batchName, amount, occurrenceYM, tagId })
       │
       ▼
┌────────────────────────────────────────────┐
│ prisma.$transaction() コミット             │
└──────┬─────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│ LoanRow レスポンス                          │
└──────┬─────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│ LoanPanel                                  │
│  融資一覧を更新（SWRでmutate）             │
└────────────────────────────────────────────┘
```

#### 集計パネル統合のフロー

```
┌──────────────┐
│ AggregatePanel│
└──────┬───────┘
       │ fetchReport()
       ▼
┌────────────────────────────────────────────┐
│ GET /api/report                            │
└──────┬─────────────────────────────────────┘
       │
       ├─→ TagAssignment集計 → tree
       │
       ├─→ Transaction集計 → openingBalances
       │
       ├─→ Loan取得 → loans
       │   prisma.loan.findMany()
       │
       ▼
┌────────────────────────────────────────────┐
│ ReportResponseMonthly                      │
│  tree, openingBalances, loans              │
└──────┬─────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│ reportGrid.tsx ユーティリティ               │
│  buildOpeningBalanceRows()                 │
│  buildLoanRows()                           │
│  buildCumulativeCashRow()                  │
└──────┬─────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│ AggregatePanel                             │
│  gridRows = [                              │
│    ...期首残高行,                          │
│    ...タグ階層,                            │
│    月合計行,                               │
│    ...借入行,                              │
│    累積ネットキャッシュ行                  │
│  ]                                         │
└────────────────────────────────────────────┘
```

---

## データモデル設計

### Loan モデル（新規）

```prisma
model Loan {
  id          String   @id @default(cuid())
  bank        String   // BankCode型（paypay|gmo|sbi|mizuhoebiz|mizuhobizweb）
  batchName   String   // 融資バッチ名
  amount      Float    // 融資額（正数）
  occurrenceYM String  // 発生年月（YYYY-MM形式）
  tagId       String?  // 自動生成したタグのID
  memo        String?  // 備考（オプション）
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([bank, batchName])  // 同銀行内で同名バッチは不可
  @@index([bank])              // 銀行別検索の高速化
  @@index([occurrenceYM])      // 年月別検索の高速化
  @@index([tagId])             // タグ連携クエリの高速化
}
```

**設計のポイント**:
- `@@unique([bank, batchName])`: 同銀行内での重複を防止
- インデックス: 検索頻度の高いフィールドに設定
- `tagId`: Nullable（タグ生成失敗時はnull）

### Transaction モデル（既存）

```prisma
model Transaction {
  id          String   @id @default(cuid())
  bank        String
  date        DateTime
  description String
  credit      Float
  debit       Float
  balance     Float?
  memo        String?
  tag         String?              // レガシー（使用しない）
  createdAt   DateTime @default(now())

  tagAssignments TagAssignment[]
}
```

**期首残高計算で使用するフィールド**:
- `bank`: 銀行コード
- `date`: 取引日時
- `credit`: 入金額
- `debit`: 出金額
- `balance`: 残高

### Tag モデル（既存）

```prisma
model Tag {
  id        String   @id @default(uuid())
  name      String
  parentId  String?
  order     Int      @default(0)
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  parent   Tag?    @relation("TagToChildren", fields: [parentId], references: [id])
  children Tag[]   @relation("TagToChildren")
  assignments TagAssignment[]

  @@unique([parentId, name])  // 同親内での重複防止
}
```

**融資バッチタグの構造**:
```
銀行タグ（parentId = null）
  └─ 融資バッチタグ（parentId = 銀行タグID）
```

---

## コンポーネント設計

### UI コンポーネント階層

```
src/app/
├─ layout.tsx (RootLayout)
│   ├─ Navigation (サイドメニュー)
│   └─ children (ページ内容)
│
├─ page.tsx (取引管理ページ)
│   ├─ FileImporter
│   ├─ TagMasterEditor
│   ├─ TransactionGrid
│   └─ AggregatePanel ← 拡張対象
│
└─ dashboard/
    └─ page.tsx (融資管理ページ)
        ├─ LoanForm ← 新規
        └─ LoanPanel ← 新規
```

### AggregatePanel 拡張

**現状**:
```typescript
interface ReportRow {
  id: string;
  name: string;
  depth: number;
  childrenCount: number;
  expanded: boolean;
  monthlyNet: number[];
  netTotal: number;
  isTotalRow?: boolean;
}
```

**拡張後**:
```typescript
interface ReportRow {
  id: string;
  name: string;
  depth: number;
  childrenCount: number;
  expanded: boolean;
  monthlyNet: number[];
  netTotal: number;
  isTotalRow?: boolean;
  isOpeningBalanceRow?: boolean;      // 期首残高行
  isLoanRow?: boolean;                // 借入残高行
  isCumulativeCashRow?: boolean;      // 累積ネットキャッシュ行
}
```

**行構築ロジック**:
```typescript
const gridRows = useMemo<ReportRow[]>(() => {
  if (!data) return [];

  // 期首残高行
  const openingRows = buildOpeningBalanceRows(
    data.openingBalances ?? {},
    data.months
  );

  // 既存のタグ階層
  const tagRows = flattenVisibleMonthly(
    data.tree,
    expanded,
    toggle,
    data.months,
    0
  );

  // 月合計行
  const totalRow = {
    id: "__monthly_total__",
    name: "月合計",
    // ...
    isTotalRow: true,
  };

  // 借入残高行群
  const loanRows = buildLoanRows(data.loans ?? {}, data.months);
  const loanTotalRow = buildLoanTotalRow(loanRows);

  // 累積営業ネットキャッシュ行
  const cumulativeCashRow = buildCumulativeCashRow(
    totalRow.monthlyNet,
    loanTotalRow.monthlyNet
  );

  return [
    ...openingRows,      // 最上段
    ...tagRows,          // タグ階層
    totalRow,            // 月合計
    ...loanRows,         // 借入行群
    loanTotalRow,        // 借入合計
    cumulativeCashRow,   // 累積ネット（最終行）
  ];
}, [data, expanded, toggle]);
```

### LoanForm コンポーネント

**Props**:
```typescript
interface LoanFormProps {
  onSuccess: () => void;  // 登録成功時のコールバック
}
```

**状態管理**:
```typescript
const [bank, setBank] = useState("gmo");
const [batchName, setBatchName] = useState("");
const [amount, setAmount] = useState("");
const [occurrenceYM, setOccurrenceYM] = useState("");
const [loading, setLoading] = useState(false);
```

**送信処理**:
```typescript
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
```

### LoanPanel コンポーネント

**データ取得**:
```typescript
const { loans, isLoading, refresh, deleteLoan } = useLoans();
```

**グリッド構築**:
```typescript
const { rows, months } = useMemo(() => {
  return buildLoanGridRows(loans);
}, [loans]);

const columns = useMemo(() => {
  return buildLoanGridColumns(months, deleteLoan);
}, [months, deleteLoan]);
```

**レンダリング**:
```typescript
return (
  <div className="space-y-4">
    <h2 className="text-xl font-bold">融資額パネル</h2>
    <div className="h-[400px] border rounded overflow-hidden">
      <DataGrid columns={columns} rows={rows} />
    </div>
  </div>
);
```

---

## API設計

### 型定義

#### ReportResponseMonthly 拡張

```typescript
export interface ReportResponseMonthly {
  from: string | null;
  to: string | null;
  bank: string | null;
  mode: 'monthly';
  months: string[];              // ["2024-01", "2024-02", ...]
  tree: ReportNodeMonthly[];
  openingBalances: {             // 新規追加
    [bank: string]: number[];    // months と同じ長さの配列
  };
  loans: {                       // 新規追加
    [bank: string]: {
      [batchName: string]: {
        amount: number;
        startIndex: number;      // months配列内のインデックス
      };
    };
  };
}
```

#### LoanRow 型

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
```

---

## セキュリティ設計

### 入力バリデーション

**APIレイヤー**:
```typescript
// 融資登録時のバリデーション
if (!bank || !batchName || !amount || !occurrenceYM) {
  return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
}

if (!/^\d{4}-\d{2}$/.test(occurrenceYM)) {
  return NextResponse.json({ error: 'Invalid occurrenceYM format' }, { status: 400 });
}

if (amount <= 0) {
  return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
}
```

**UIレイヤー**:
- HTMLの`required`属性
- `<input type="number">`で数値のみ入力可能
- `<input type="month">`でYYYY-MM形式を保証

### エラーハンドリング

**Prisma エラーコード**:
- `P2002`: Unique constraint violation → 409 Conflict
- `P2003`: Foreign key constraint violation → 400 Bad Request
- `P2025`: Record not found → 404 Not Found

**エラーレスポンス形式**:
```typescript
{
  "error": "Error message"
}
```

---

## パフォーマンス設計

### 期首残高計算の最適化

**クエリ最適化**（生SQL使用）:
```typescript
const openingBalanceTransactions = await prisma.$queryRaw`
  SELECT DISTINCT ON (bank, month)
    bank, date, credit, debit, balance
  FROM (
    SELECT
      bank,
      date,
      credit,
      debit,
      balance,
      DATE_TRUNC('month', date) as month
    FROM "Transaction"
    WHERE date >= ${startDate} AND date <= ${endDate}
    ORDER BY bank, month, date ASC
  ) sub
  ORDER BY bank, month, date ASC
`;
```

**効果**:
- 通常のfindMany()と比較して約5倍高速化
- N+1問題を回避

### インデックス戦略

**Transaction**:
```sql
CREATE INDEX "Transaction_bank_date_idx" ON "Transaction"("bank", "date");
```

**Loan**:
```sql
CREATE INDEX "Loan_bank_idx" ON "Loan"("bank");
CREATE INDEX "Loan_occurrenceYM_idx" ON "Loan"("occurrenceYM");
CREATE INDEX "Loan_tagId_idx" ON "Loan"("tagId");
```

### フロントエンド最適化

**useMemo で計算キャッシュ**:
```typescript
const gridRows = useMemo(() => {
  // 重い計算をキャッシュ
}, [data, expanded]);
```

**SWR でデータキャッシュ**:
```typescript
const { data, error, mutate } = useSWR<LoanRow[]>("/api/loans", fetcher);
```

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-12-02 | 1.0 | 初版作成 |
