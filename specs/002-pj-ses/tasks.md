# Tasks: 複数・階層タグ付与とタグ別集計レポート

本ファイルは `.github/prompts/tasks.prompt.md` に従い、TDD 順・依存順で実行可能な指示を列挙します。`[P]` は並列可能（異なるファイル/関心）を示します。

## 前提（Setup）

- T001: [SETUP] Prisma/DB 準備とスクリプト確認（`DATABASE_URL` 設定、`pnpm install` 実施、`pnpm prisma generate`）
  - Notes: DB 接続確認。`/Users/shuya/Documents/physical/bank-csv-grid/prisma/schema.prisma` の現状を把握（後方互換の `Transaction.tag` 有り）。

## データモデル（Models）

- T002: [P] Tag モデルの追加（`/Users/shuya/Documents/physical/bank-csv-grid/prisma/schema.prisma`）
  - Add: `parentId`, `order`, `active`、一意制約 `(parentId, name)`、タイムスタンプ。
  - Output: migration, Prisma client 再生成。
- T003: [P] TagAssignment モデルの追加（`/Users/shuya/Documents/physical/bank-csv-grid/prisma/schema.prisma`）
  - Add: `transactionId`, `tagId`, 一意制約 `(transactionId, tagId)`。
  - Output: migration, Prisma client 再生成。
- T004: Transaction の後方互換方針反映（`legacyTag` として `tag` を温存）（`/Users/shuya/Documents/physical/bank-csv-grid/prisma/schema.prisma`）
  - Notes: 既存 `tag` は nullable のまま残置。将来移行用の注記。

## 契約テスト（Contracts Tests）

- T005: [P] 契約テスト: GET `/api/tags` ツリー取得（`/Users/shuya/Documents/physical/bank-csv-grid/tests/contract/tags.get.test.ts`）
  - Assert: 200/スキーマ/任意深さの階層表現。
- T006: [P] 契約テスト: POST `/api/tags` 作成/更新（`/Users/shuya/Documents/physical/bank-csv-grid/tests/contract/tags.post.test.ts`）
  - Assert: 重複名（同親内）で 409、正当時 200。
- T007: [P] 契約テスト: GET `/api/transactions/:id/tags`（`/Users/shuya/Documents/physical/bank-csv-grid/tests/contract/tx.tags.get.test.ts`）
  - Assert: 200/取引の葉タグ一覧。
- T008: [P] 契約テスト: PUT `/api/transactions/:id/tags` 置換（`/Users/shuya/Documents/physical/bank-csv-grid/tests/contract/tx.tags.put.test.ts`）
  - Assert: 204/重複禁止/存在しないタグで 400。
- T009: [P] 契約テスト: GET `/api/report`（`/Users/shuya/Documents/physical/bank-csv-grid/tests/contract/report.get.test.ts`）
  - Assert: 200/階層ロールアップの小計/合計。
- T010: [P] 契約テスト: GET `/api/export`（`/Users/shuya/Documents/physical/bank-csv-grid/tests/contract/export.get.test.ts`）
  - Assert: 200/CSV フォーマット（フルパス列など）。

## 統合テスト（Integration Tests）

- T011: [P] ストーリー検証: タグ作成 → 取引に付与 → レポート生成（`/Users/shuya/Documents/physical/bank-csv-grid/tests/integration/tagging-report.test.ts`）
  - Flow: research/quickstart の手順を自動化。

## サービス/ユーティリティ（Services）

- T012: タグツリー取得サービス（新規: `/Users/shuya/Documents/physical/bank-csv-grid/src/utils/tags.ts`）
  - Build: 任意深さのツリー構築、active フィルタ、order 適用。
- T013: 集計サービス（`/Users/shuya/Documents/physical/bank-csv-grid/src/utils/summary.ts` 強化）
  - Build: 葉 → 祖先へロールアップ、重複排除、期間/銀行フィルタ。

## API 実装（Endpoints）

- T014: 実装: GET `/api/tags`（`/Users/shuya/Documents/physical/bank-csv-grid/src/app/api/tags/route.ts`）
  - Use: T012 のサービス。
- T015: 実装: POST `/api/tags`（`/Users/shuya/Documents/physical/bank-csv-grid/src/app/api/tags/route.ts`）
  - Validate: 同親内重複、親存在確認。
- T016: 実装: GET `/api/transactions/[id]/tags`（新設 or 既存拡張: `/Users/shuya/Documents/physical/bank-csv-grid/src/app/api/transactions/[id]/route.ts`）
  - Return: 葉タグ IDs/paths。
- T017: 実装: PUT `/api/transactions/[id]/tags`（新設 or 既存拡張: `/Users/shuya/Documents/physical/bank-csv-grid/src/app/api/transactions/[id]/route.ts`）
  - Behavior: 置換、重複禁止、存在チェック、監査ログ発火のプレースホルダ。
- T018: 実装: GET `/api/report`（新設: `/Users/shuya/Documents/physical/bank-csv-grid/src/app/api/report/route.ts`）
  - Output: 階層ノードごとの小計/合計。
- T019: 実装: GET `/api/export`（`/Users/shuya/Documents/physical/bank-csv-grid/src/app/api/export/route.ts`）
  - Output: CSV（フルパス列、期間/銀行フィルタ）。

## UI（Components）

- T020: Tag 選択 UI（`/Users/shuya/Documents/physical/bank-csv-grid/src/components/TagSelectEditor.tsx` 拡張）
  - Spec: 動的カスケード、検索、複数選択、任意深さ対応。既存との後方互換表示。
- T021: 集計レポート表示（`/Users/shuya/Documents/physical/bank-csv-grid/src/components/AggregatePanel.tsx`）
  - Show: 階層と小計/合計、展開/折りたたみ。

## 運用/監査/パフォーマンス（Ops）

- T022: 監査ログフックの追加（`/Users/shuya/Documents/physical/bank-csv-grid/src/lib/utils.ts` など）
  - Record: 付与/削除/更新（誰が/いつ/何を → 何に）。
- T023: マイグレーション適用スクリプトと README 追記（`/Users/shuya/Documents/physical/bank-csv-grid/README.md`）
- T024: パフォーマンス計測ポイント（計測・ロギング）

## ドキュメント/仕上げ（Polish）

- T025: [P] `quickstart.md` 更新（最新 API/例の整合）
- T026: [P] `research.md` 更新（設計決定の反映）
- T027: [P] `data-model.md` 更新（最終スキーマ反映）
- T028: [P] OpenAPI 更新（スキーマ詳細/例追加）

## 並列実行例（Examples）

- 並列グループ A: T002 [P] + T003 [P]
- 並列グループ B: T005 [P] + T006 [P] + T007 [P] + T008 [P] + T009 [P] + T010 [P]
- 並列グループ C: T025 [P] + T026 [P] + T027 [P] + T028 [P]

## 依存関係（Dependencies）

- T001 → T002, T003, T004
- T002, T003 → T012, T014, T015, T016, T017, T018, T019
- テスト（T005-T011） → 対応実装（T012-T019）
- サービス（T012, T013） → API（T014-T019）
- API → UI（T020-T021）
- 実装完了 → 運用/ドキュメント（T022-T028）
