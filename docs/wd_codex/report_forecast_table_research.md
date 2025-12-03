# 資金繰り予測テーブル 技術調査レポート (RDG + HyperFormula)

## 1. 概要サマリー
- 予測テーブルは AggregatePanel（実績）の行・列キーを踏襲しつつ、KPI/計算/定数行とメモ/係数列を追加する（要件: `docs/04_prp.md`）。  
- UI は React-Data-Grid（RDG、`x_react-data-grid/src/DataGrid.tsx`）を採用。左固定列＋大量月次列＋summaryRowsで合計・小計を表現し、編集・コピー/ペースト・フィルハンドル・キーボード操作を標準機能で実装。  
- 計算は HyperFormula（HF、`x_hyperformula/src/HyperFormula.ts`）をヘッドレス式エンジンとして利用し、RDGセルとHFセルを 0-based でマッピング。`setCellContents`→`valuesUpdated`イベントで差分再計算を取得し、RDG rows をパッチ更新する。  
- 共通モデル化: `rowType`/`colType`メタを導入した基底行・基底列スキーマを作り、実績/予測を同一キー構造で扱う。予測専用行（kpi/constant/formula）と補助列（memo/param）を可変的に追加可能にする。  
- MVP: KPI 手入力＋横フィル、簡易式 (=A1*1.1) の計算行、定数行参照、キャッシュ繰越、単セルコピー/ペースト・フィルハンドル、過去期間ロック。将来のシナリオや高度な式に備え、HF ラッパとスキーマを抽象化する。  

## 2. React-Data-Grid 解析（x_react-data-grid）
- 主な API/プロップ（`DataGridProps` in `src/DataGrid.tsx`）
  - 列/行: `columns`, `rows`, `rowKeyGetter`, `defaultColumnOptions`, `columnWidths`/`onColumnWidthsChange`。  
  - サマリ行: `topSummaryRows`/`bottomSummaryRows` + `renderSummaryCell`。`summaryRowHeight`。  
  - 固定/レイアウト: `frozen` 列、`rowHeight/headerRowHeight/summaryRowHeight`、`enableVirtualization`。  
  - 編集: `renderEditCell` or `editable`, `onRowsChange`, `onCellDoubleClick`/`editOnClick` で編集開始。  
  - コピー/ペースト/フィル: `onCellCopy`, `onCellPaste`, `onFill`（フィルハンドル）。`onFill` はドラッグまたはダブルクリックで `sourceRow→targetRow` を更新し `onRowsChange` に渡す（`updateRows` ロジック, lines ~780-820）。  
  - キーボード: 矢印/Tab/Enter/Home/End/PageUp/Down を `navigate` で処理（lines ~870-960）。Tab は `canExitGrid` でグリッド外へフォーカス移動を判定。  
  - イベント: `onSelectedCellChange`, `onScroll`, `onColumnResize`, `onColumnsReorder`。  
  - クラス指定: `cellClass/headerCellClass/summaryCellClass/rowClass` で負数赤字・行種別強調を実現可。  
- 標準で素直に実現できる要件
  - 左固定列/ヘッダ固定 (`frozen`)、列リサイズ (`resizable`)、列ドラッグ (`draggable`)、summaryRows で合計・小計、単セル矩形選択＋コピー/ペースト、フィルハンドル（同列への横引き/縦引き）、キーボード移動、基本編集。  
- カスタム実装が必要な要件
  - 過去期間ロック（`editable` を関数化し、ペースト/フィル時にも `isCellEditable` チェックを追加）、複数レンジ選択や高度クリップボード（標準は1矩形）、フィルでの式展開、行タイプ別レンダ、月次列の大量生成と折りたたみ、メモ列のトグル表示。  
- 制約・既知の課題
  - 選択は1矩形のみ。フィルは列に沿った単純コピー（式ロジックは呼び出し側で実装）。大量列では初期レンダ負荷が高いので `useMemo` で列をキャッシュし、幅テーブルを持つ。  
- 実装ベストプラクティス
  - `columns/rows/summaryRows` を `useMemo`。`onRowsChange` はイミュータブルでパッチ（`indexes` 付き）。  
  - ペースト/フィルは「選択セル座標→更新パッチ」を作り `onRowsChange` で一括反映。  
  - Frozen＋横スクロール時は固定幅を明示し、列キーは安定文字列（例: `m_2024-01`）。  
  - サマリ行は `topSummaryRows`/`bottomSummaryRows` の2段構成が可能。  

## 3. HyperFormula 解析（x_hyperformula）
- 基本 API
  - インスタンス生成: `HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' })` / `buildFromArray` / `buildFromSheets`。  
  - シート操作: `addSheet`, `getSheetId`, `setSheetName`, `removeSheet`。  
  - 値/式設定: `setCellContents(SimpleCellAddress, RawCellContent | RawCellContent[][])` で値/式/A1 参照を投入。`SimpleCellAddress` は `{sheet,row,col}` 0-based（`src/Cell.ts`）。  
  - 取得: `getCellValue`, `getCellFormula`, `getSheetValues`。  
  - 名前付き定義: `addNamedExpression`, `removeNamedExpression`, `getNamedExpression`。  
  - 依存・再計算イベント: `on('valuesUpdated', handler)` で差分 `ExportedChange[]` を受ける。評価の suspend/resume (`suspendEvaluation`/`resumeEvaluation`) もイベントを発火。  
- 式・参照
  - A1 参照・範囲、四則、基本関数 (SUM/AVERAGE/IF/PMT など) を標準サポート。  
  - 0-based アドレス → A1 文字列は内部で解決。列インデックスを安定マップ（`column.key -> colIndex`）で保持する必要あり。  
- RDG 連携パターン
  - 編集完了: RDG 編集 → `setCellContents(addr, valueOrFormula)` → HF 再計算 → `valuesUpdated` で変更セル一覧を受け取り RDG rows をパッチ。  
  - KPI/定数/計算行のみ HF に載せ、実績/ロックセルは定数投入。  
  - キャッシュ繰越は HF 式（前月セル参照）または RDG 側ループで算出し、結果を HF に反映。  
- 制約・注意
  - ライセンス: AGPLv3（商用は別ライセンス要検討）。  
  - サイズ: デフォルトで行 10^6 / 列 ~18k 上限。初期化は最小サイズで。  
  - 大量更新時はまとめて `setCellContents` → `valuesUpdated` で差分適用。式パースは文字列依存なので入力バリデーション推奨。  

## 4. AggregatePanel との差分整理
- 現行実績: `AggregatePanel.tsx` + `reportGrid.tsx` は表示専用。行順は「期首残高 → タグ階層 → 月合計 → 借入行 → 借入合計 → 累積ネット」。月次列のみ。編集/ペースト/フィル無し。  
- 予測で追加すべき要素
  - 行タイプ: `rowType = actual|kpi|constant|formula|subtotal|total` とし、`formula`/`value` を保持。  
  - 列タイプ: `month` に加え `memo`/`param` など先頭固定列。  
  - 編集/コピー/フィル/ロック: RDG の `editable`/`onCellPaste`/`onFill` を拡張し、過去期間判定を共通化。  
  - 計算: HF で式・依存を管理し、時系列繰越や比率計算をセル参照で表現。  
- 共通化の方向
  - `BaseRow { id, name, depth, monthly[] }` を基底に `rowType`, `cells`, `formula`, `readOnly` を持つ `ForecastRow`。  
  - `BaseColumn { key, kind: 'month'|'memo'|'param', frozen?: true }` で列メタを統一。実績は month のみ、予測は補助列追加。  
  - レンダラを行/列タイプで分岐し、計算行は read-only、KPI/定数は edit 用セルレンダを割り当て。  

## 5. 統合アーキテクチャ案（MVP / 将来拡張）
- レイヤ構成
  - UI(RDG): 列/行生成、編集/選択/コピー/フィル (`onCellPaste/onFill`)、スタイル（負数赤、行種別強調、ロック）、summaryRows。  
  - ドメイン: `RowType/ColType/Cell` モデル + スキーマ定義。列キー→HF列インデックスのマップを単一ソースで管理。  
  - 計算: `FormulaEngine` ラッパ（HF 実装）で set/get/onValuesUpdated を隠蔽。繰越・集計は HF 式 or 自前関数でプラグイン可能に。  
  - 永続化: 予測データ/式/メタの保存 API（MVP はローカル or 一時保存）。  
- MVP スコープ
  1) KPI 行: 手入力＋フィルハンドル (`onFill`) で横引き。  
  2) 計算行: 簡易式 (=A1*1.1) を HF に設定し、`valuesUpdated` で結果を反映。  
  3) 定数行: 係数を保持し計算行が参照。  
  4) キャッシュ繰越: 前月末→当月期首を式 or 自前計算で実装。  
  5) 単セルコピー/ペースト・フィル、過去期間ロック（`editable` 関数 + ペースト/フィル時チェック）。  
- 将来拡張を見据えた抽象化
  - `FormulaEngine` インターフェースで HF 以外に差し替え可能に。  
  - `RowSchema`/`ColumnSchema` を単一ソースにし、UI・計算登録を共通化。  
  - シナリオ: `scenarioId` 列 or シート分割を前提にデータモデルを設計。  
  - 値と表示の分離（内部値/式とフォーマット済み文字列）。パース/フォーマットを共通ユーティリティ化。  

## 6. リスク・懸念・未確定事項
- HF ライセンス (AGPLv3) の商用可否確認が必須。  
- パフォーマンス: 大量行×月列の初期生成・フィル/ペースト時の負荷。列生成の memo 化とパッチ適用を徹底。  
- 列キーと HF 列インデックスのズレ防止（単一マップ/関数で管理）。  
- 過去期間ロックの漏れ（編集/ペースト/フィル/キーボード全経路にガードが必要）。  
- シナリオ拡張を許容するデータ構造にする（単一シナリオ前提の固定化は避ける）。  
- HF 計算値と RDG 表示の差異発生時の UX（エラーハイライト、再計算トリガ）の設計が未定。  
- 永続化フォーマット（値 + 式 + 行/列メタ）の決定が未了。  
