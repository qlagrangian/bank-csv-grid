## Context
- 目的: タグ階層（内部勘定科目）をCSVで一括インポート/エクスポート可能にし、初期セットアップや大規模修正を容易にする。
- 現状: TagMasterEditor で手動追加/削除のみ。Tagモデルは name/parentId/order/active。TagAssignment は別テーブル。
- 要件の核: 階層列シフトで表現するシンプルなCSVを採用し、プレビュー・ドライラン・マージ/置換モードを提供する。

## CSVフォーマット（案）
- エンコーディング: UTF-8。1行1タグ。
- ヘッダ必須: `Level1,Level2,Level3,...,Order,Active`
  - Level列: 左から階層順。最左の非空セルが親、その右隣以降の非空セルの最後がタグ名。
  - Order: 任意数値。未指定なら読み込み順で 10,20,30… を付与。
  - Active: `true/false`（大小/空白許容）。未指定は true。
- 無効行: 全Level空行はスキップ。空白のみはスキップ。Levelの途中欠損（例: L1空/L2有）はエラー。
- 最大階層: 5〜6程度で制限を設け、超過はエラー。

## インポート処理
- エンドポイント: `POST /api/tags/import-csv`
  - 入力: FormData(file) または JSON { csv: string }。クエリ/Bodyに `mode=merge|replace` (default merge), `dryRun=true|false`。
  - バリデーション: 重複（同親同名）、循環（自分を親にする行は不可）、欠損、深さ超過。
  - マージ: 既存ツリーを保持しつつ、行ごとに親を辿り upsert（同親同名はスキップ/警告）。Order/Activeが指定されていれば更新。
  - 置換: 既存タグを全削除後に新ツリーを挿入（TagAssignmentは別途手当てが必要だが今回は対象外）。
  - Dry-run: DBは変更せず、作成予定・更新予定・スキップ・エラーをサマリで返す。
  - レスポンス例: `{ created: n, updated: n, skipped: n, errors: [{line, message}], warnings: [...] }`

## エクスポート処理
- エンドポイント: `GET /api/tags/export-csv`
  - 出力: 上記フォーマットに従い、最長深さ分のLevel列を出す（欠損は空文字）。Order, Active 列も出力。
  - Content-Type: `text/csv; charset=utf-8`

## UIフロー
- TagMasterEditor付近に「CSVインポート」「CSVエクスポート」ボタンを追加。
- インポートUI: ファイル選択→プレビュー（ツリー表示 or テーブル表示）→適用。モード選択（merge/replace）、Dry-run結果を表示し、エラー行を明示。
- エクスポート: クリックで即ダウンロード。

## 決めたこと / 非Goal
- 決定: フォーマットは列シフト型 + Order/Activeオプション。Dry-run必須。置換モードはTagAssignmentの扱いは今回は触れない（後続検討）。
- 非Goal: TagAssignmentの再構築、タグ名称変更APIの実装、別文字コード対応（Shift_JIS等）。

## Risks / Mitigations
- 置換モードでTagAssignment孤児が発生 → 今回は対象外であり、警告メッセージを返す（後続でマイグレーション手当て）。
  (マージモードであれば既存タグを保持するため影響は限定的。)
- CSVの手入力ミス → Dry-runと詳細エラー行で防ぐ。
- 深さ不足 → レベル数を可変でパースし、最大深さ超過をエラーにする。
