# Tasks: 資金繰り予測パネル MVP実装

## Phase 0: プロトタイプ検証 (2-3人日)

### Task 0.1: HyperFormula動作確認
- [x] HyperFormula のインストール（`npm install hyperformula`）
- [x] 小規模グリッド（10行×12列）でのプロトタイプ作成
- [x] 座標マッピング（RDG ↔ HF）の動作確認
- [x] `valuesUpdated` イベント購読のテスト

**Validation**: プロトタイプで式入力・再計算が動作すること

### Task 0.2: パフォーマンステスト
- [ ] 1000行×36列のダミーデータ生成
- [ ] レンダリング時間計測（目標: < 2秒）
- [ ] フィル操作のレスポンス計測（目標: < 100ms）
- [ ] ボトルネックの特定と対策検討

**Validation**: パフォーマンス目標を達成、または対策案が明確になること

---

## Phase 1: 基本編集機能 (3-5人日)

### Task 1.1: 型定義作成
- [x] `src/types/forecast.ts` 作成
  - `ForecastRow` 型定義
  - `RowType` 型定義（'kpi' | 'constant' | 'formula' | ...）
  - `ForecastColumn` 型定義

**Validation**: TypeScriptコンパイルが通ること

### Task 1.2: 行・列構築ユーティリティ
- [x] `src/utils/forecastGrid.tsx` 作成
  - `buildForecastColumns(months: string[]): ForecastColumn[]`
  - `flattenForecastRows(rawRows: ForecastRow[], expanded: Set<string>): ForecastRow[]`
  - 月次列の生成ロジック
  - 階層行のフラット化ロジック（既存 `reportGrid.tsx` 参考）
**Validation**: ユニットテストが通ること

### Task 1.3: 過去期間ロック実装
- [x] `isCellEditable(row: ForecastRow, colKey: string): boolean` 関数作成
  - 基準日（例: `2025-01-01`）以降のみ編集可
  - 計算行・小計行・合計行は常に読み取り専用
- [x] React-Data-Grid の `editable` プロパティに関数を適用

**Validation**: 過去期間のセルが編集不可になること

### Task 1.4: ForecastPanel コンポーネント作成
- [x] `src/components/ForecastPanel.tsx` 作成
  - 状態管理: `rows`, `columns`, `expanded`
  - ダミーデータ生成（KPI行2行、定数行1行、計算行1行）
  - React-Data-Grid の基本レンダリング
  - 編集ハンドラ (`onRowsChange`) の実装

**Validation**: ブラウザでForecastPanelが表示され、編集可能なセルに入力できること

### Task 1.5: フィルハンドル実装
- [x] `onFill` ハンドラの実装
  - KPI/定数行: 同値コピー
  - 計算行: 変更なし（読み取り専用）
  - 過去期間: 変更なし（ロック）
- [x] フィル操作の動作確認

**Validation**: KPI行でフィルハンドルを使って横引きできること

---

## Phase 2: HyperFormula統合 (5-7人日)

### Task 2.1: FormulaEngine インターフェース定義
- [x] `src/lib/formulaEngine.ts` 作成
  - `FormulaEngine` インターフェース定義
  - `SimpleCellAddress` 型定義
  - `setCellValue`, `setCellFormula`, `getCellValue`, `onValuesUpdated` メソッド

**Validation**: TypeScriptコンパイルが通ること

### Task 2.2: CoordinateMapper 実装
- [x] 座標マッピングクラス作成
  - `toHFAddress(rowIdx: number, colKey: string): SimpleCellAddress`
  - `fromHFAddress(addr: SimpleCellAddress): { rowIdx: number; colKey: string }`
  - 列キー → HF列インデックスのマップ管理

**Validation**: ユニットテストで座標変換が正しいこと

### Task 2.3: HyperformulaAdapter 実装
- [x] `src/lib/hyperformulaAdapter.ts` 作成
  - `FormulaEngine` インターフェースを実装
  - HyperFormula インスタンス管理
  - `setCellValue`, `setCellFormula` の実装
  - `valuesUpdated` イベント購読

**Validation**: ユニットテストで式設定・取得が動作すること

### Task 2.4: ForecastPanel に式エンジン統合
- [x] `HyperformulaAdapter` インスタンスを状態管理
  - コンポーネントマウント時に初期化
  - アンマウント時に `destroy()` 呼び出し
- [x] `onRowsChange` 時に式エンジンを更新
  - 式セルの場合: `setCellFormula`
  - 値セルの場合: `setCellValue`
- [x] `valuesUpdated` イベントで rows を差分更新

**Validation**: 計算行に式（`=A1*1.1`）を入力し、自動計算されること

### Task 2.5: 定数行の参照実装
- [x] 定数行（成長率、係数など）を追加
- [x] 計算行で定数行を参照する式を設定（例: `=A5*$B$1`）
- [x] 定数変更時に計算行が自動更新されることを確認

**Validation**: 定数を変更すると、参照している計算行が自動更新されること

---

## Phase 3: キャッシュ繰越 (2-3人日)

### Task 3.1: 期首残高行の追加
- [x] `rowType: 'opening'` を追加
- [x] 期首残高行のレンダリング（既存 `aggregate-panel` 参考）
- [x] スタイル適用（黄色背景など）

**Validation**: 期首残高行が表示されること

### Task 3.2: 前月繰越ロジック実装
- [x] 前月末残高 → 当月期首残高の計算
  - HyperFormula式で実装: `=前月末セル`
  - または、自前ロジックで計算して `setCellValue`
- [x] 月次列すべてに繰越式を設定

**Validation**: 前月の値を変更すると、当月期首残高が自動更新されること

### Task 3.3: 累積営業ネットキャッシュ行
- [x] 既存 `aggregate-panel` と同様の累積行を追加
- [x] `前月累積 + 当月入出金` の式を設定

**Validation**: 累積行が正しく計算されること

---

## Phase 4: UI/UX改善 (2-3人日)

### Task 4.1: 視覚的フィードバック
- [x] マイナス値のハイライト（赤字表示）
- [x] 計算行の背景色（読み取り専用を強調）
- [x] KPI/定数行の背景色（編集可能を強調）
- [x] 過去期間のグレーアウト

**Validation**: セルの種別が視覚的に判別できること

### Task 4.2: エラーハンドリング
- [x] 式パースエラーのハイライト
- [x] ツールチップでエラー詳細を表示
- [x] 循環参照のエラー表示

**Validation**: 不正な式を入力すると、エラーが表示されること

### Task 4.3: コピー/ペースト実装
- [x] `onCopy` ハンドラの実装
- [x] `onPaste` ハンドラの実装
- [x] 過去期間へのペーストをブロック
- [x] Excel形式でのコピー/ペースト動作確認

**Validation**: Excelからコピーした値をペーストできること

---

## Phase 5: テスト・ドキュメント (2-3人日)

### Task 5.1: ユニットテスト作成
- [x] `forecastGrid.tsx` のテスト
- [x] `CoordinateMapper` のテスト
- [x] `HyperformulaAdapter` のテスト
- [x] `isCellEditable` のテスト

**Validation**: `npm test` で全テストが通ること

### Task 5.2: 統合テスト作成
- [ ] フィルハンドルの統合テスト
- [ ] 式の自動再計算の統合テスト
- [ ] 過去期間ロックの統合テスト

**Validation**: 統合テストが通ること

### Task 5.3: パフォーマンステスト
- [ ] 1000行×36列での負荷テスト
- [ ] レンダリング時間・フィル操作時間の計測
- [ ] 目標値との比較

**Validation**: パフォーマンス目標を達成すること

### Task 5.4: ドキュメント更新
- [ ] CLAUDE.md に ForecastPanel の説明を追加
- [ ] project.md に機能追加を反映
- [ ] README.md に使用方法を追加

**Validation**: ドキュメントが最新の実装を反映していること

---

## 依存関係

```
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
         (並行可)   (Phase1完了後)  (Phase2完了後)  (すべて完了後)
```

## 推定工数

| Phase | 工数（人日） |
|-------|--------------|
| Phase 0 | 2-3 |
| Phase 1 | 3-5 |
| Phase 2 | 5-7 |
| Phase 3 | 2-3 |
| Phase 4 | 2-3 |
| Phase 5 | 2-3 |
| **合計** | **16-24** |

**開発者1名の場合**: 3-5週間
