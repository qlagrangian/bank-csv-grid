## 1. Implementation
- [x] 1.1 設計: CSVフォーマット（階層列/ヘッダ必須/UTF-8）、バリデーション、merge/replace/dry-runの挙動とAPI契約をdesign.mdにまとめる
- [x] 1.2 バックエンド: CSVパーサと検証（重複/循環/空セル/最大階層）、`POST /api/tags/import-csv` (dry-run/merge/replace) を実装し結果サマリを返す
- [x] 1.3 バックエンド: `GET /api/tags/export-csv` を実装し、現行タグツリーを同一フォーマットでダウンロードできるようにする
- [x] 1.4 フロント: TagMasterEditor付近にCSVインポートUI（アップロード→プレビュー→適用、dry-run結果表示）とエクスポートボタンを追加する
- [x] 1.5 テスト/検証: 代表ケース（新規、既存マージ、replace、循環/重複エラー、深さ制限）で動作確認し、`npx openspec validate add-tag-import-csv --strict`
