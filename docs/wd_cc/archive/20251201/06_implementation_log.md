# Implementation Log - Loan Management & Opening Balance Feature

**Change ID**: `add-loan-management-opening-balance`
**Implementation Date**: 2025-12-02
**Status**: ✅ Completed

## Overview

融資管理機能と期首残高計算機能を実装しました。4つのフェーズ（Database、API、UI、Testing）すべてが完了し、全機能が正常に動作しています。

## Implementation Summary

### Phase 1: Database & Data Model (完了)

**実装内容:**
- Loanモデルを追加（Prisma schema）
  - フィールド: `id`, `bank`, `batchName`, `amount`, `occurrenceYM`, `tagId`, `memo`, `createdAt`, `updatedAt`
  - Unique制約: `[bank, batchName]`
  - インデックス: `bank`, `occurrenceYM`, `tagId`

**マイグレーション:**
- `20251202092332_add_loan_model.sql` 作成・適用完了
- テストスクリプト `scripts/test-loan-model.ts` で検証完了

**変更ファイル:**
- `prisma/schema.prisma` - Loanモデル追加
- `prisma/migrations/20251202092332_add_loan_model/` - マイグレーションファイル
- `scripts/test-loan-model.ts` - テストスクリプト

### Phase 2: API Implementation (完了)

**実装内容:**

#### 1. Loan API (src/app/api/loans/)
- **POST /api/loans** - 融資登録 + タグ自動生成
  - バリデーション: bank, batchName, amount, occurrenceYM (YYYY-MM形式)
  - タグ階層自動生成: 銀行タグ（親） → バッチタグ（子）
  - Prisma transaction使用
  - 重複チェック（P2002エラーハンドリング）

- **GET /api/loans** - 融資一覧取得
  - オプショナル `bank` クエリパラメータでフィルタリング
  - occurrenceYM降順でソート

- **PATCH /api/loans/[id]** - 融資更新
  - 更新可能フィールド: `amount`, `occurrenceYM`
  - occurrenceYMフォーマット検証

- **DELETE /api/loans/[id]** - 融資削除 + 条件付きタグ削除
  - Prisma transactionで以下を実行:
    1. Loan削除
    2. TagAssignment件数チェック
    3. 件数=0の場合のみタグ削除

#### 2. Report API拡張 (src/app/api/report/route.ts)
- **期首残高計算ロジック追加:**
  - LOGIC-01: 当月に取引あり → balance ± (credit/debit)
  - LOGIC-02: 過去に取引なし → 0
  - LOGIC-03: 当月に取引なし → 前月最終残高
  - 全銀行のトランザクションから計算（タグ割り当て有無に関わらず）

- **借入データ取得:**
  - 全融資を取得し、銀行別・バッチ別に整形
  - startIndex計算（月配列内の開始インデックス）

**型定義:**
- `src/types/loan.ts` - LoanRow, CreateLoanRequest, UpdateLoanRequest
- `src/types/report.ts` - ReportResponseMonthlyに `openingBalances`, `loans` フィールド追加

**変更ファイル:**
- `src/app/api/loans/route.ts` (新規)
- `src/app/api/loans/[id]/route.ts` (新規)
- `src/app/api/report/route.ts` (拡張)
- `src/types/loan.ts` (新規)
- `src/types/report.ts` (拡張)

### Phase 3: UI Implementation (完了)

**実装内容:**

#### 1. Navigation (サイドメニュー)
- `src/components/Navigation.tsx` (新規)
- リンク: Home, Dashboard
- Active状態ハイライト（usePathname使用）

#### 2. Dashboard Page (融資管理画面)
- `src/app/dashboard/page.tsx` (新規)
- LoanForm + LoanPanel を含む
- Cardコンポーネントでレイアウト

#### 3. Loan Form (融資登録フォーム)
- `src/components/LoanForm.tsx` (新規)
- フィールド:
  - 銀行: BankSelect
  - 融資バッチ名: Input (text)
  - 融資額: Input (number)
  - 発生年月: Input (month)
- POST /api/loans へsubmit
- 成功時: フォームリセット + onSuccess callback

#### 4. Loan Panel (融資一覧グリッド)
- `src/components/LoanPanel.tsx` (新規)
- react-data-grid使用
- useLoans hook経由でデータ取得
- 列: 銀行、融資バッチ、月別金額（開始月以降に金額表示）、操作（削除ボタン）

#### 5. Loan Grid Utils
- `src/utils/loanGrid.tsx` (新規)
- `buildLoanGridRows`: 月別金額配列生成（startIndex以降にamount）
- `buildLoanGridColumns`: グリッド列定義生成

#### 6. Loan Hook
- `src/hooks/useLoans.ts` (新規)
- SWR使用
- loans配列、loading状態、deleteLoan関数、refresh関数を提供

#### 7. Aggregate Panel拡張
- `src/components/AggregatePanel.tsx` (拡張)
- gridRows構築ロジック更新:
  1. 期首残高行群（buildOpeningBalanceRows）
  2. タグ階層行群（既存）
  3. 月合計行
  4. 借入行群（buildLoanRows）
  5. 借入合計行（buildLoanTotalRow）
  6. 累積営業ネットキャッシュ行（buildCumulativeCashRow）

#### 8. Report Grid Utils拡張
- `src/utils/reportGrid.tsx` (拡張)
- ReportRow interface拡張:
  - `isOpeningBalanceRow?: boolean`
  - `isLoanRow?: boolean`
  - `isCumulativeCashRow?: boolean`
- 新規関数:
  - `buildOpeningBalanceRows`: 期首残高行生成
  - `buildLoanRows`: 借入行群生成
  - `buildLoanTotalRow`: 借入合計行生成
  - `buildCumulativeCashRow`: 累積ネットキャッシュ行生成
- renderCell拡張: 各行タイプに応じたスタイリング
  - 期首残高: bg-yellow-50 (薄黄色背景)
  - 借入残高: text-blue-700 (青色テキスト)
  - 累積ネットキャッシュ: text-green-700 font-bold (緑色太字)

#### 9. Layout拡張
- `src/app/layout.tsx` (拡張)
- Navigationコンポーネント統合
- Flexレイアウト: Navigation + Main content

**変更ファイル:**
- `src/components/Navigation.tsx` (新規)
- `src/app/dashboard/page.tsx` (新規)
- `src/components/LoanForm.tsx` (新規)
- `src/components/LoanPanel.tsx` (新規)
- `src/utils/loanGrid.tsx` (新規)
- `src/hooks/useLoans.ts` (新規)
- `src/components/AggregatePanel.tsx` (拡張)
- `src/utils/reportGrid.tsx` (拡張)
- `src/app/layout.tsx` (拡張)

### Phase 4: Integration & Testing (完了)

**テスト実施項目:**

#### 1. 融資登録とタグ自動生成 ✅
- **テスト1**: gmo銀行、2024年春季融資、1000万円を登録
  - 結果: tagId自動生成、銀行タグ・バッチタグの階層構造作成成功
- **テスト2**: sbi銀行、2024年夏季融資、500万円を登録
  - 結果: 異なるtagId生成、独立した階層構造作成成功

#### 2. 期首残高計算 ✅
- **テスト**: GET /api/report?from=2024-01-01&to=2024-12-31
- **結果**:
  - gmo銀行の12ヶ月分の期首残高が正しく計算
  - 1月: 0（最初の取引前 - LOGIC-02）
  - 2月以降: 前月最終残高から計算（LOGIC-03）
- **修正**: assignsからではなく、全transactionから銀行コードを取得するよう修正

#### 3. 融資更新 ✅
- **テスト**: PATCH /api/loans/[id] でamount=12000000、occurrenceYM=2024-05に変更
- **結果**: 正常に更新、updatedAtタイムスタンプ更新

#### 4. 融資削除と条件付きタグ削除 ✅
- **テスト**: sbi融資を削除
- **結果**:
  - 融資レコード削除成功
  - バッチタグ（子タグ）削除成功（TagAssignment=0）
  - 銀行タグ（親タグ）は残存（再利用可能）

#### 5. レポートAPI統合 ✅
- **テスト**: openingBalances + loans データ取得
- **結果**:
  - openingBalances: 銀行別・月別の期首残高配列
  - loans: 銀行別・バッチ別の融資データ + startIndex

#### 6. ビルド ✅
- `npm run build` 成功（エラーなし）

## Issues Fixed

### 1. Next.js 15 Async Params対応
**問題**: Route handlersでparams型エラー
**修正**:
```typescript
// Before
{ params }: { params: { id: string } }

// After
{ params }: { params: Promise<{ id: string }> }
const { id } = await params;
```
**影響ファイル**:
- `src/app/api/loans/[id]/route.ts`
- `src/app/api/transactions/[id]/tags/route.ts`

### 2. DataGrid Import修正
**問題**: react-data-gridのdefault importエラー
**修正**:
```typescript
// Before
import DataGrid from "react-data-grid";

// After
import { DataGrid } from "react-data-grid";
```
**影響ファイル**:
- `src/components/LoanPanel.tsx`

### 3. TransactionRow型拡張対応
**問題**: 新しいフィールド（isLinkedChild, isDeactivated）に対するRecord型エラー
**修正**: JP_NAME、headerオブジェクトに全フィールドを追加
**影響ファイル**:
- `src/utils/columns.tsx`
- `src/utils/summary.ts`

### 4. useTagOptions修正
**問題**: useTags hookが `tags` ではなく `tree` を返す
**修正**: tree取得 + flatten関数でフラット化
**影響ファイル**:
- `src/hooks/useTagOptions.ts`

### 5. TypeScript strict mode対応
**問題**: cacheKey、existingの暗黙的any型エラー
**修正**: 明示的な型注釈追加
**影響ファイル**:
- `src/utils/tagCsv.ts`

### 6. tsconfig.json調整
**問題**: ビルド時にtest/scriptsディレクトリを含む、jest型定義エラー
**修正**:
- exclude配列にpdf-import-standalone、tests、scriptsを追加
- types配列からjestを削除

### 7. 期首残高計算のバグ修正
**問題**: openingBalancesのキーが"undefined"になる
**原因**: assignsからbank取得（タグ割り当て済みトランザクションのみ対象）
**修正**: transactionテーブル全体からdistinct bankを取得
**影響ファイル**:
- `src/app/api/report/route.ts`

## API Endpoints

### 新規エンドポイント
- `POST /api/loans` - 融資登録
- `GET /api/loans` - 融資一覧取得
- `PATCH /api/loans/[id]` - 融資更新
- `DELETE /api/loans/[id]` - 融資削除

### 拡張エンドポイント
- `GET /api/report` - openingBalances、loansフィールド追加

## UI Components

### 新規コンポーネント
- `Navigation` - サイドメニュー
- `LoanForm` - 融資登録フォーム
- `LoanPanel` - 融資一覧グリッド

### 新規ページ
- `/dashboard` - 融資管理ダッシュボード

### 拡張コンポーネント
- `AggregatePanel` - 期首残高・借入・累積ネットキャッシュ行追加
- `Layout` - Navigation統合

## Database Schema Changes

```prisma
model Loan {
  id          String   @id @default(cuid())
  bank        String
  batchName   String
  amount      Float
  occurrenceYM String  // YYYY-MM format
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

## Tag Hierarchy Design

融資登録時のタグ自動生成:

```
Bank Tag (parent=null, name=bank)
  └─ Batch Tag (parent=BankTag, name=batchName)
```

**例**:
```
gmo (親タグ)
  └─ 2024年春季融資 (子タグ) ← Loan.tagId
```

## Files Changed

### 新規作成 (17 files)
- `prisma/migrations/20251202092332_add_loan_model/migration.sql`
- `scripts/test-loan-model.ts`
- `src/types/loan.ts`
- `src/app/api/loans/route.ts`
- `src/app/api/loans/[id]/route.ts`
- `src/components/Navigation.tsx`
- `src/app/dashboard/page.tsx`
- `src/components/LoanForm.tsx`
- `src/components/LoanPanel.tsx`
- `src/utils/loanGrid.tsx`
- `src/hooks/useLoans.ts`
- `docs/wd_cc/06_implementation_log.md` (this file)

### 変更 (8 files)
- `prisma/schema.prisma` - Loanモデル追加
- `src/types/report.ts` - openingBalances, loansフィールド追加
- `src/app/api/report/route.ts` - 期首残高計算・借入データ取得追加
- `src/components/AggregatePanel.tsx` - gridRows構築ロジック拡張
- `src/utils/reportGrid.tsx` - 新規行ビルダー関数・スタイリング追加
- `src/app/layout.tsx` - Navigation統合
- `src/utils/columns.tsx` - JP_NAME拡張
- `src/utils/summary.ts` - header拡張

### 修正 (6 files)
- `src/app/api/loans/[id]/route.ts` - async params対応
- `src/app/api/transactions/[id]/tags/route.ts` - async params対応
- `src/components/LoanPanel.tsx` - DataGrid import修正
- `src/hooks/useTagOptions.ts` - tree対応
- `src/utils/tagCsv.ts` - 型注釈追加
- `tsconfig.json` - exclude/types調整

## Testing Results

### Manual API Testing
- ✅ POST /api/loans - 2件登録成功（gmo, sbi）
- ✅ GET /api/loans - 一覧取得成功
- ✅ GET /api/loans?bank=gmo - フィルタリング成功
- ✅ PATCH /api/loans/[id] - 更新成功
- ✅ DELETE /api/loans/[id] - 削除 + タグ削除成功
- ✅ GET /api/report - 期首残高・借入データ取得成功
- ✅ GET /api/tags - タグ階層構造確認

### Build & Type Check
- ✅ `npm run build` - エラーなし
- ✅ TypeScript strict mode - エラーなし

### Integration Testing
- ✅ 融資登録 → タグ自動生成 → 一覧表示
- ✅ 融資更新 → 金額・発生年月変更
- ✅ 融資削除 → タグ条件付き削除
- ✅ レポート生成 → 期首残高・借入データ統合

## Performance Notes

- 期首残高計算: 銀行数 × 月数のループ（各月でDB問い合わせ）
  - 現在の実装: N*M回のDB query
  - 最適化候補: バッチクエリ化（将来の改善案）

- タグ自動生成: Prisma transactionで原子性保証

## Deployment Notes

1. **マイグレーション適用**:
   ```bash
   npx prisma migrate deploy
   ```

2. **環境変数**: 変更なし（既存のDATABASE_URL使用）

3. **ビルド**:
   ```bash
   npm run build
   ```

4. **起動**:
   ```bash
   npm start
   ```

## Future Improvements

### Performance
- [ ] 期首残高計算のバッチクエリ化
- [ ] レポートAPIのキャッシング

### Features
- [ ] 融資返済管理（分割返済スケジュール）
- [ ] 融資残高推移グラフ
- [ ] 複数年度対応

### UX
- [ ] 融資一覧のソート・フィルタ強化
- [ ] 融資詳細ページ
- [ ] 融資テンプレート機能

## Conclusion

全4フェーズの実装が完了し、APIテスト・ビルド・統合テストすべてが成功しました。融資管理機能（CRUD + タグ自動生成）、期首残高計算、集計パネル拡張が期待通りに動作しています。

**実装完了日**: 2025-12-02
**実装者**: Claude Code
**レビュー**: ユーザー動作確認済み（Phase 4）
