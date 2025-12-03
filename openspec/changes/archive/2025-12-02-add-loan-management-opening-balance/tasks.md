# Tasks: Add Loan Management and Opening Balance Features

## Overview

このタスクリストは、融資管理機能と期首残高計算機能の実装を4つのPhaseに分割し、各Phaseで独立した機能を完成させる。各タスクは小さく検証可能で、ユーザーに見える価値を段階的に提供する。

**実装参照**: `docs/wd_cc/05_implementation_guide.md` の内容を厳守すること。

---

## Phase 1: Database & Data Model (30 minutes)

### Task 1.1: Add Loan model to Prisma schema
- [ ] `prisma/schema.prisma`にLoanモデルを追加
  - Fields: `id`, `bank`, `batchName`, `amount`, `occurrenceYM`, `tagId`, `memo`, `createdAt`, `updatedAt`
  - `@@unique([bank, batchName])` 制約を追加
  - `@@index([bank])`, `@@index([occurrenceYM])`, `@@index([tagId])` を追加
- [ ] 変更をコミット前に確認

**Validation**: Prismaスキーマ構文エラーがないことを確認

**Dependencies**: なし

---

### Task 1.2: Create and apply migration
- [ ] `npx prisma migrate dev --name add_loan_model` を実行
- [ ] マイグレーションファイル（`prisma/migrations/XXXXXX_add_loan_model/migration.sql`）を確認
- [ ] `npx prisma generate` でPrisma clientを再生成
- [ ] `node_modules/.prisma/client/index.d.ts` に `Loan` 型が追加されたことを確認

**Validation**:
- マイグレーションが成功する
- Prisma clientに `prisma.loan` が存在する

**Dependencies**: Task 1.1

---

### Task 1.3: Test Loan model basic operations
- [ ] テストスクリプト `scripts/test-loan-model.ts` を作成
  - Loan作成テスト
  - Unique制約テスト（P2002エラー確認）
  - Loan削除テスト
- [ ] `npx tsx scripts/test-loan-model.ts` で動作確認
- [ ] テスト後にレコードをクリーンアップ

**Validation**:
- Loan作成が成功する
- 同銀行・同バッチ名の重複でP2002エラーが発生する

**Dependencies**: Task 1.2

**Parallel opportunity**: Phase 2の型定義作成と並行可能

---

## Phase 2: API Implementation (3 hours)

### Task 2.1: Create Loan type definitions
- [ ] `src/types/loan.ts` を新規作成
  - `LoanRow` インターフェース定義
  - `CreateLoanRequest` インターフェース定義
  - `UpdateLoanRequest` インターフェース定義
- [ ] 型エクスポートを確認

**Validation**: TypeScriptコンパイルエラーがないことを確認

**Dependencies**: Task 1.2 (Prisma client生成後)

**Parallel opportunity**: Task 1.3と並行可能

---

### Task 2.2: Implement GET /api/loans
- [ ] `src/app/api/loans/route.ts` を新規作成
- [ ] GET handlerを実装
  - `bank` クエリパラメータでの絞り込み対応
  - `orderBy: [{ bank: 'asc' }, { occurrenceYM: 'asc' }]` でソート
  - エラーハンドリング（500 Internal Server Error）
- [ ] curlでテスト: `curl http://localhost:3000/api/loans`

**Validation**:
- 空配列が返される（初期状態）
- `bank=gmo` での絞り込みが動作する

**Dependencies**: Task 2.1

---

### Task 2.3: Implement POST /api/loans with tag auto-generation
- [ ] POST handlerを `src/app/api/loans/route.ts` に追加
- [ ] バリデーションロジックを実装
  - 必須フィールドチェック
  - `occurrenceYM` フォーマット検証（`/^\d{4}-\d{2}$/`）
  - `amount > 0` 検証
- [ ] タグ自動生成ロジックを実装（`prisma.$transaction` 使用）
  1. 銀行タグの検索/作成（`parentId = null`）
  2. 融資バッチタグの作成（銀行タグの子）
  3. P2002エラー時は既存タグを取得
  4. Loanレコード作成
- [ ] エラーハンドリング
  - P2002（Loan重複）→ 409 Conflict
  - その他 → 500 Internal Server Error
- [ ] curlでテスト: `curl -X POST http://localhost:3000/api/loans -H "Content-Type: application/json" -d '{"bank":"gmo","batchName":"テスト融資","amount":10000000,"occurrenceYM":"2024-04"}'`

**Validation**:
- 融資が登録される
- タグが自動生成される（DBで確認）
- 重複登録で409エラーが返される

**Dependencies**: Task 2.2

---

### Task 2.4: Implement PATCH /api/loans/[id]
- [ ] `src/app/api/loans/[id]/route.ts` を新規作成
- [ ] PATCH handlerを実装
  - `amount` と `occurrenceYM` の更新のみ許可
  - `occurrenceYM` のフォーマット検証
  - P2025（Record not found）→ 404 Not Found
- [ ] curlでテスト: `curl -X PATCH http://localhost:3000/api/loans/{id} -H "Content-Type: application/json" -d '{"amount":12000000}'`

**Validation**:
- 融資額が更新される
- 存在しないIDで404エラーが返される

**Dependencies**: Task 2.3

---

### Task 2.5: Implement DELETE /api/loans/[id] with conditional tag deletion
- [ ] DELETE handlerを `src/app/api/loans/[id]/route.ts` に追加
- [ ] 条件付きタグ削除ロジックを実装（`prisma.$transaction` 使用）
  1. Loanを取得
  2. `TagAssignment.count({ where: { tagId } })` で使用状況を確認
  3. count = 0 の場合のみタグを削除
  4. Loanを削除
- [ ] P2025エラー時は404 Not Found
- [ ] curlでテスト: `curl -X DELETE http://localhost:3000/api/loans/{id}`

**Validation**:
- 融資が削除される
- 未使用タグは削除される
- 使用中タグは保持される（TagAssignmentを作成して確認）

**Dependencies**: Task 2.4

---

### Task 2.6: Extend ReportResponseMonthly type
- [ ] `src/types/report.ts` を編集
- [ ] `ReportResponseMonthly` インターフェースに以下を追加:
  - `openingBalances: { [bank: string]: number[] }`
  - `loans: { [bank: string]: { [batchName: string]: { amount: number; startIndex: number } } }`

**Validation**: TypeScriptコンパイルエラーがないことを確認

**Dependencies**: Task 2.1

**Parallel opportunity**: Task 2.5と並行可能

---

### Task 2.7: Add opening balance calculation to /api/report
- [ ] `src/app/api/report/route.ts` を編集
- [ ] 期首残高計算ロジックを追加（GET関数の末尾）
  - 各銀行・各月ごとにループ
  - LOGIC-01: 当月の最初のトランザクションから逆算
    - 入金: `balance - credit`
    - 出金: `balance + debit`
  - LOGIC-03: 当月に取引がない場合は前月の最終残高を繰越
  - LOGIC-02: 全く取引がない場合は0
- [ ] `openingBalances` オブジェクトを構築
- [ ] curlでテスト: `curl http://localhost:3000/api/report | jq '.openingBalances'`

**Validation**:
- `openingBalances` フィールドが返される
- 各銀行の期首残高配列の長さが `months` 配列と一致する

**Dependencies**: Task 2.6

---

### Task 2.8: Add loan data to /api/report response
- [ ] `src/app/api/report/route.ts` を編集
- [ ] Loan取得・整形ロジックを追加
  - `prisma.loan.findMany()` で全融資を取得
  - 銀行ごとに整理
  - `startIndex` を計算（`months.indexOf(loan.occurrenceYM)`）
  - 範囲外の場合は `-1`
- [ ] `loans` オブジェクトを構築
- [ ] レスポンスに追加: `openingBalances`, `loans`
- [ ] curlでテスト: `curl http://localhost:3000/api/report | jq '.loans'`

**Validation**:
- `loans` フィールドが返される
- `startIndex` が正しく計算される

**Dependencies**: Task 2.7

---

## Phase 3: UI Implementation (4 hours)

### Task 3.1: Create Navigation component
- [ ] `src/components/Navigation.tsx` を新規作成
- [ ] Navigationコンポーネントを実装
  - `usePathname()` でアクティブページを判定
  - リンク: `/` (取引管理), `/dashboard` (融資管理)
  - スタイル: `w-64 bg-gray-100 border-r`
  - アクティブ: `bg-blue-600 text-white`
  - 非アクティブ: `hover:bg-gray-200`

**Validation**: コンポーネントが正しくレンダリングされる（手動確認）

**Dependencies**: Task 2.8完了後（API準備完了）

---

### Task 3.2: Integrate Navigation into RootLayout
- [ ] `src/app/layout.tsx` を編集
- [ ] Navigationをimport
- [ ] レイアウトを変更:
  ```tsx
  <div className="flex h-screen">
    <Navigation />
    <main className="flex-1 overflow-auto">
      {children}
    </main>
  </div>
  ```
- [ ] ブラウザで表示確認

**Validation**:
- サイドメニューが表示される
- 取引管理ページが右側に表示される

**Dependencies**: Task 3.1

---

### Task 3.3: Create useLoans hook
- [ ] `src/hooks/useLoans.ts` を新規作成
- [ ] useSWRで `/api/loans` をフェッチ
- [ ] `deleteLoan` 関数を実装
- [ ] エクスポート: `loans`, `isLoading`, `error`, `refresh`, `deleteLoan`

**Validation**: TypeScriptコンパイルエラーがないことを確認

**Dependencies**: Task 2.8

**Parallel opportunity**: Task 3.2と並行可能

---

### Task 3.4: Create LoanForm component
- [ ] `src/components/LoanForm.tsx` を新規作成
- [ ] フォーム実装
  - 銀行選択（BankSelect使用）
  - 融資バッチ名入力
  - 融資額入力（`type="number"`）
  - 発生年月入力（`type="month"`）
  - 登録ボタン
- [ ] `handleSubmit` 関数を実装
  - `POST /api/loans` でデータ送信
  - エラーハンドリング（alertで表示）
  - 成功時にフォームリセット + `onSuccess()` コールバック
- [ ] Props: `{ onSuccess: () => void }`

**Validation**: コンポーネントが正しくレンダリングされる（手動確認）

**Dependencies**: Task 3.3

---

### Task 3.5: Create loan grid utility functions
- [ ] `src/utils/loanGrid.tsx` を新規作成
- [ ] `buildLoanGridRows` 関数を実装
  - Loansから月次配列を構築
  - 発生月以前は `null`、以降は `amount`
- [ ] `buildLoanGridColumns` 関数を実装
  - 列: 銀行、融資バッチ、月次列、操作（削除ボタン）
  - 削除ボタンで確認ダイアログ表示
- [ ] 型定義: `LoanGridRow`

**Validation**: TypeScriptコンパイルエラーがないことを確認

**Dependencies**: Task 3.4

**Parallel opportunity**: Task 3.4と並行可能

---

### Task 3.6: Create LoanPanel component
- [ ] `src/components/LoanPanel.tsx` を新規作成
- [ ] useLoansフックを使用
- [ ] useMemoで `rows`, `months`, `columns` を構築
- [ ] react-data-gridでグリッド表示
- [ ] 高さ: `h-[400px]`

**Validation**: コンポーネントが正しくレンダリングされる（手動確認）

**Dependencies**: Task 3.5

---

### Task 3.7: Create dashboard page
- [ ] `src/app/dashboard/page.tsx` を新規作成
- [ ] Cardレイアウトで2つのセクションを配置:
  1. 新規融資登録（LoanForm）
  2. 融資一覧（LoanPanel）
- [ ] LoanFormの `onSuccess` で `window.location.reload()` を実行

**Validation**:
- `/dashboard` ページが表示される
- 融資登録フォームが動作する
- 融資一覧が表示される

**Dependencies**: Task 3.6

---

### Task 3.8: Extend ReportRow type for new row types
- [ ] `src/utils/reportGrid.tsx` を編集
- [ ] `ReportRow` インターフェースに以下を追加:
  - `isOpeningBalanceRow?: boolean`
  - `isLoanRow?: boolean`
  - `isCumulativeCashRow?: boolean`

**Validation**: TypeScriptコンパイルエラーがないことを確認

**Dependencies**: Task 2.8

**Parallel opportunity**: Task 3.7と並行可能

---

### Task 3.9: Add opening balance row builder
- [ ] `src/utils/reportGrid.tsx` に `buildOpeningBalanceRows` 関数を追加
- [ ] `openingBalances` と `months` から期首残高行を構築
- [ ] 行名: `{bank} 期首残高`
- [ ] `isOpeningBalanceRow: true` フラグを設定

**Validation**: 関数が正しく動作する（ユニットテスト推奨）

**Dependencies**: Task 3.8

---

### Task 3.10: Add loan row builders
- [ ] `src/utils/reportGrid.tsx` に以下を追加:
  - `buildLoanRows` 関数: 各融資の月次行を構築
  - `buildLoanTotalRow` 関数: 借入合計行を構築
  - `buildCumulativeCashRow` 関数: 累積ネット行を構築
- [ ] 行名:
  - 借入: `{bank} > {batchName}`
  - 借入合計: `借入合計`
  - 累積ネット: `累積営業ネットキャッシュ`
- [ ] フラグ設定: `isLoanRow`, `isCumulativeCashRow`

**Validation**: 関数が正しく動作する（ユニットテスト推奨）

**Dependencies**: Task 3.9

---

### Task 3.11: Extend AggregatePanel gridRows construction
- [ ] `src/components/AggregatePanel.tsx` を編集
- [ ] `gridRows` useMemoを更新
  1. `buildOpeningBalanceRows()` で期首残高行を追加
  2. 既存のタグ階層行を構築
  3. 月合計行を構築
  4. `buildLoanRows()` で借入行群を追加
  5. `buildLoanTotalRow()` で借入合計行を追加
  6. `buildCumulativeCashRow()` で累積ネット行を追加
- [ ] 行配列を正しい順序で返す

**Validation**:
- グリッド行が正しい順序で表示される
- TypeScriptエラーがない

**Dependencies**: Task 3.10

---

### Task 3.12: Add styles for new row types
- [ ] `src/utils/reportGrid.tsx` の `buildReportColumnsDepth` 関数を編集
- [ ] `renderCell` で新しい行タイプのスタイルを追加:
  - `isOpeningBalanceRow`: `bg-yellow-50 font-semibold`
  - `isLoanRow`: `text-blue-700 font-semibold`
  - `isCumulativeCashRow`: `text-green-700 font-bold`

**Validation**:
- 期首残高行が薄黄色背景で表示される
- 借入行が青色テキストで表示される
- 累積ネット行が緑色太字で表示される

**Dependencies**: Task 3.11

---

## Phase 4: Integration & Testing (2 hours)

### Task 4.1: Test opening balance calculation
- [x] 開発サーバーを起動: `npm run dev`
- [x] ブラウザで `http://localhost:3000` を開く
- [x] 集計パネルの最上段に期首残高行が表示されることを確認
- [x] テストケース:
  - 当月に取引がある銀行（入金/出金）
  - 当月に取引がない銀行
  - 全く取引がない銀行
- [x] 各月の期首残高が正しく計算されていることを確認

**Validation**:
- 期首残高行が表示される
- 計算ロジックが正しい（手動検証）

**Dependencies**: Task 3.12

---

### Task 4.2: Test loan registration and tag auto-generation
- [x] ブラウザで `http://localhost:3000/dashboard` を開く
- [x] 新規融資を登録
- [x] タグマスターで自動生成されたタグを確認
  - 銀行タグ（parentId = null）
  - 融資バッチタグ（銀行タグの子）
- [x] 同銀行で別の融資を登録し、銀行タグが共有されることを確認

**Validation**:
- 融資が正常に登録される
- タグが自動生成される
- 銀行タグが共有される

**Dependencies**: Task 4.1

---

### Task 4.3: Test loan deletion and conditional tag deletion
- [x] 融資額パネルで削除ボタンをクリック
- [x] 確認ダイアログで「OK」を選択
- [x] 融資が削除されることを確認
- [x] タグマスターで以下を確認:
  - TagAssignmentがない場合: タグも削除される
  - TagAssignmentがある場合: タグは残る
- [x] 返済取引を作成してTagAssignmentを追加し、再度テスト

**Validation**:
- 未使用タグは削除される
- 使用中タグは保持される

**Dependencies**: Task 4.2

---

### Task 4.4: Test aggregate panel integration
- [x] ブラウザで `http://localhost:3000` を開く
- [x] 集計パネルで以下を確認:
  - 期首残高行が最上段に表示
  - タグ階層集計が表示
  - 月合計行が表示
  - 借入残高行群が表示（発生月以前は0、以降は融資額）
  - 借入合計行が表示
  - 累積営業ネットキャッシュ行が最下段に表示
- [x] 計算が正しいことを確認:
  - 累積ネット = 月合計 - 借入合計

**Validation**:
- 全行が正しい順序で表示される
- 計算が正確である
- スタイルが正しく適用される

**Dependencies**: Task 4.3

---

### Task 4.5: Performance testing
- [x] Chrome DevTools Networkタブで `/api/report` のレスポンスタイムを計測
- [x] 目標: 1秒以内
- [x] Chrome DevTools Performanceタブでグリッド描画時間を計測
- [x] 目標: 1秒以内
- [x] 問題がある場合は最適化を実施:
  - インデックス追加
  - クエリ最適化
  - useMemoの見直し

**Validation**:
- report APIレスポンスタイム < 1秒
- グリッド描画時間 < 1秒

**Dependencies**: Task 4.4

---

### Task 4.6: End-to-end flow testing
- [x] 完全なユーザーフローをテスト:
  1. 融資登録（/dashboard）
  2. タグ確認（/）
  3. 返済取引作成（タグ付け）
  4. 集計パネル確認（期首残高、借入残高、累積ネット）
  5. 融資削除（タグ保持確認）
- [x] 各ステップで期待通りの動作を確認

**Validation**:
- 全フローが正常に動作する
- データ整合性が保たれる

**Dependencies**: Task 4.5

---

## Parallelization Opportunities

以下のタスクは並行実行可能:

**Group A** (データモデルとAPI):
- Task 1.3 と Task 2.1 (型定義)

**Group B** (API実装):
- Task 2.4 (PATCH) と Task 2.6 (型拡張)
- Task 2.5 (DELETE) と Task 2.6 (型拡張)

**Group C** (UI実装):
- Task 3.2 (Navigation統合) と Task 3.3 (useLoans)
- Task 3.4 (LoanForm) と Task 3.5 (loanGrid utility)
- Task 3.7 (dashboard page) と Task 3.8 (ReportRow拡張)

---

## Rollback Instructions

各Phaseで問題が発生した場合のロールバック手順:

**Phase 1**:
```bash
npx prisma migrate resolve --rolled-back <migration_name>
DROP TABLE "Loan";
```

**Phase 2**:
- 新規エンドポイント削除
- report API拡張を元に戻す

**Phase 3**:
- Navigation削除
- dashboard/page.tsx削除
- AggregatePanel元に戻す

**Phase 4**:
- データクリーンアップ
- タグ手動削除

---

## Completion Criteria

すべてのタスクが完了し、以下の基準を満たすこと:

- [x] 全APIエンドポイントが動作する
- [x] 融資登録時にタグが自動生成される
- [x] 期首残高が正しく計算・表示される
- [x] 集計パネルの全行が正しい順序で表示される
- [x] パフォーマンス要件を満たす（< 1秒）
- [x] TypeScriptコンパイルエラーがない
- [x] 手動テストで全フローが動作する
- [x] `/api/report` の months と openingBalances/loans の整合性を実データで確認した
