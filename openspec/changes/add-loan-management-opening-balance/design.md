# Design: Add Loan Management and Opening Balance Features

## Architecture Overview

本変更は、既存の取引管理システムに融資管理機能を追加し、集計パネルを拡張して期首残高・借入残高・累積ネットキャッシュを表示する。

### System Context

```
┌─────────────────────────────────────────────────────────────┐
│                    Bank CSV Grid System                     │
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │ Transaction  │         │     Loan     │  ← 新規追加   │
│  │ Management   │         │  Management  │                │
│  └──────┬───────┘         └──────┬───────┘                │
│         │                        │                         │
│         │  ┌─────────────────────┴───────┐                │
│         │  │   Tag System (共通)         │                │
│         │  │  - 銀行タグ                 │                │
│         │  │  - 融資バッチタグ           │                │
│         │  └─────────────────────────────┘                │
│         │                        │                         │
│         ▼                        ▼                         │
│  ┌──────────────────────────────────────┐                │
│  │      Aggregate Panel (拡張)          │                │
│  │  - 期首残高行                        │                │
│  │  - タグ階層集計                      │                │
│  │  - 借入残高行群                      │                │
│  │  - 累積ネットキャッシュ              │                │
│  └──────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

## Data Model

### New Model: Loan

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

**設計判断:**
- `@@unique([bank, batchName])`: 同銀行内での重複を防止し、タグ生成時の一意性を保証
- `tagId`: Nullable（タグ生成失敗時はnull、削除時は制約なし）
- インデックス: 検索頻度の高いフィールド（bank, occurrenceYM, tagId）に設定
- `occurrenceYM`は文字列（YYYY-MM形式）: フロントエンドのmonth入力と親和性が高い

### Relationships

```
Tag (銀行タグ)
  └─ Tag (融資バッチタグ) ← Loan.tagId
       └─ TagAssignment ← Transaction (返済取引)
```

**タグ階層例:**
```
GMO (銀行タグ)
  └─ 2024年春季融資 (融資バッチタグ)
SBI (銀行タグ)
  └─ 運転資金A (融資バッチタグ)
```

## API Design

### New Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/loans` | 融資一覧取得 |
| POST | `/api/loans` | 新規融資登録（タグ自動生成含む） |
| PATCH | `/api/loans/[id]` | 融資更新（金額・発生年月のみ） |
| DELETE | `/api/loans/[id]` | 融資削除（条件付きタグ削除） |

### Extended Endpoint

| Method | Endpoint | Extension |
|--------|----------|-----------|
| GET | `/api/report` | `openingBalances`, `loans`フィールドを追加 |

#### Response Extension

**Before:**
```typescript
{
  from, to, bank, mode, months, tree
}
```

**After:**
```typescript
{
  from, to, bank, mode, months, tree,
  openingBalances: { [bank: string]: number[] },  // 期首残高
  loans: {                                        // 融資データ
    [bank: string]: {
      [batchName: string]: { amount: number; startIndex: number }
    }
  }
}
```

## Data Flow

### Loan Registration Flow

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
       │   Tag.findFirst({ name: bank, parentId: null })
       │   存在しない場合: Tag.create()
       │
       ├─→ 融資バッチタグを作成
       │   Tag.create({ name: batchName, parentId: 銀行タグID })
       │   重複の場合（P2002）: 既存タグを取得
       │
       ├─→ Loanレコードを作成
       │   Loan.create({ bank, batchName, amount, occurrenceYM, tagId })
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

**重要な設計判断:**
- トランザクションを使用: タグ生成とLoan作成をアトミックに実行
- P2002エラーハンドリング: 重複タグは既存タグを使用、重複Loanは409 Conflictを返す
- 銀行タグの共有: 同銀行の複数融資で同じ銀行タグを使用

### Opening Balance Calculation Flow

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
       │ For each bank, for each month:
       │
       ├─→ LOGIC-01: 当月の最初のトランザクションを取得
       │   Transaction.findFirst({
       │     where: { bank, date: { gte: monthStart, lte: monthEnd } },
       │     orderBy: { date: 'asc' }
       │   })
       │   存在する場合:
       │     - 入金（credit > 0）: 期首残高 = balance - credit
       │     - 出金（debit > 0）: 期首残高 = balance + debit
       │
       ├─→ LOGIC-03: 当月に取引がない場合
       │   Transaction.findFirst({
       │     where: { bank, date: { lt: monthStart } },
       │     orderBy: { date: 'desc' }
       │   })
       │   前月データが存在: 期首残高 = lastTx.balance
       │
       └─→ LOGIC-02: 全く取引がない場合
           期首残高 = 0
       │
       ▼
┌────────────────────────────────────────────┐
│ ReportResponseMonthly                      │
│  openingBalances: { [bank]: number[] }     │
└──────┬─────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────┐
│ AggregatePanel                             │
│  期首残高行を最上段に表示                  │
└────────────────────────────────────────────┘
```

**パフォーマンス最適化:**
- インデックス: `Transaction(bank, date)` に複合インデックスを追加
- クエリ最適化: 月次ループを最小化、必要な月のみ計算

## UI Architecture

### Component Hierarchy

```
src/app/
├─ layout.tsx (RootLayout) ← Navigation追加
│   ├─ Navigation (サイドメニュー) ← 新規
│   └─ children (ページ内容)
│
├─ page.tsx (取引管理ページ)
│   ├─ FileImporter
│   ├─ TagMasterEditor
│   ├─ TransactionGrid
│   └─ AggregatePanel ← 拡張
│
└─ dashboard/
    └─ page.tsx (融資管理ページ) ← 新規
        ├─ LoanForm ← 新規
        └─ LoanPanel ← 新規
```

### AggregatePanel Extension

**Row Construction Order:**

```typescript
gridRows = [
  ...buildOpeningBalanceRows(openingBalances, months),  // 1. 期首残高行群
  ...flattenVisibleMonthly(tree, ...),                  // 2. タグ階層
  buildTotalRow(monthlyTotals),                         // 3. 月合計行
  ...buildLoanRows(loans, months),                      // 4. 借入残高行群
  buildLoanTotalRow(loanRows),                          // 5. 借入合計行
  buildCumulativeCashRow(monthlyTotals, loanTotals),    // 6. 累積ネット行
]
```

**Visual Distinction:**

| Row Type | Style | Flag |
|----------|-------|------|
| 期首残高 | `bg-yellow-50 font-semibold` | `isOpeningBalanceRow: true` |
| 借入残高 | `text-blue-700 font-semibold` | `isLoanRow: true` |
| 累積ネット | `text-green-700 font-bold` | `isCumulativeCashRow: true` |

## Security Considerations

### Input Validation

**API Layer:**
- 融資額: 正数のみ（`amount > 0`）
- 発生年月: YYYY-MM形式（`/^\d{4}-\d{2}$/`）
- 銀行コード: BankCode型に制限

**UI Layer:**
- HTML5バリデーション: `required`, `type="number"`, `type="month"`
- フロントエンドでの事前チェック

### Error Handling

**Prisma Error Codes:**
- `P2002` (Unique constraint): 409 Conflict（同銀行・同バッチ名の融資が存在）
- `P2025` (Record not found): 404 Not Found（更新/削除時）

### Transaction Safety

- タグ生成とLoan作成は`prisma.$transaction()`でアトミックに実行
- 融資削除時のタグ削除は`TagAssignment`の有無を確認

## Performance Strategy

### Database Optimization

**Indexes:**
```sql
-- Loan
CREATE INDEX "Loan_bank_idx" ON "Loan"("bank");
CREATE INDEX "Loan_occurrenceYM_idx" ON "Loan"("occurrenceYM");
CREATE INDEX "Loan_tagId_idx" ON "Loan"("tagId");

-- Transaction（既存に追加）
CREATE INDEX "Transaction_bank_date_idx" ON "Transaction"("bank", "date");
```

**Query Optimization:**
- 期首残高計算: 月ごとに最小限のクエリ（`findFirst` with `orderBy`）
- Loan取得: 単一クエリで全件取得後、メモリ内で整形

### Frontend Optimization

**useMemo for Heavy Calculations:**
```typescript
const gridRows = useMemo(() => {
  // 期首残高行、借入行群、累積ネット行の構築
}, [data, expanded, toggle]);
```

**SWR Caching:**
```typescript
const { data, error, mutate } = useSWR<LoanRow[]>("/api/loans", fetcher);
```

### Performance Targets

| Metric | Target |
|--------|--------|
| report API response time | < 1 second |
| 期首残高計算 (100 transactions) | < 500ms |
| Grid rendering (50 rows × 12 months) | < 1 second |
| Loan registration (tag generation included) | < 1 second |

## Migration Strategy

### Phase 1: Database Schema
1. Loanモデル追加のマイグレーション作成
2. インデックス追加
3. Prisma client再生成

### Phase 2: API Implementation
1. `/api/loans` エンドポイント実装（GET/POST）
2. `/api/loans/[id]` エンドポイント実装（PATCH/DELETE）
3. `/api/report` 拡張（openingBalances, loans追加）

### Phase 3: UI Implementation
1. Navigation（サイドメニュー）実装
2. LoanForm, LoanPanel実装
3. AggregatePanel拡張（期首残高行、借入行群、累積ネット行）

### Phase 4: Integration & Testing
1. 期首残高計算テスト
2. 融資登録・削除フローテスト
3. 集計パネル統合表示テスト
4. パフォーマンステスト

## Rollback Plan

**データベース:**
- マイグレーションのロールバック: `npx prisma migrate resolve --rolled-back <migration_name>`
- Loanテーブル削除: `DROP TABLE "Loan";`

**API:**
- 新規エンドポイントは削除、既存エンドポイント（report）は前バージョンに戻す

**UI:**
- Navigation削除、dashboard/page.tsx削除、AggregatePanel元に戻す

**タグ:**
- 自動生成されたタグは手動削除、またはTagAssignmentがない場合は自動削除

## Monitoring and Observability

**Metrics to Track:**
- report APIのレスポンスタイム（P50, P95, P99）
- 期首残高計算の実行時間
- 融資登録のエラー率（P2002発生頻度）
- グリッド描画時間

**Logging:**
- API error logs: `console.error('[API /loans POST]', error)`
- タグ生成ログ: 銀行タグ/融資バッチタグの作成/取得を記録

## Trade-offs

### 1. タグ自動生成 vs 手動選択
**選択**: 自動生成
**理由**: ユーザー操作を簡素化、一貫性を保証
**トレードオフ**: 柔軟性が低下（同名タグの使い回しが制限される）

### 2. 期首残高の自動計算 vs 手動入力
**選択**: 自動計算
**理由**: 手動運用の手間削減、データ整合性の向上
**トレードオフ**: データ不正確時の対応が困難（将来的に手動入力も追加予定）

### 3. 返済処理の自動化 vs タグ付けベース
**選択**: タグ付けベース（手動管理）
**理由**: 初期実装コストを抑える、柔軟性を保つ
**トレードオフ**: 融資残高が正確に推移しない（将来的に自動化を検討）

### 4. Navigationの配置 vs タブUI
**選択**: サイドメニュー（Navigation）
**理由**: 拡張性が高い、視覚的に分かりやすい
**トレードオフ**: 画面横幅を256px消費する（レスポンシブ対応時に要検討）

## Future Enhancements

1. **返済処理の自動化**: タグ付けベースの集計から自動計算へ
2. **期首残高の手動入力**: データ不正確時の対応
3. **返済スケジュール管理**: 返済予定日と実績の管理
4. **レポートのPDF出力**: 集計パネルをPDF化
5. **レスポンシブ対応**: モバイル・タブレット対応
