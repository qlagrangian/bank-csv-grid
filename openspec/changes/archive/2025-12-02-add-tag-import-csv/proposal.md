# Change: Add Tag CSV Import/Export

## Why
- タグ階層をUIだけで管理すると初期セットアップや大規模修正が手間。プリセットをCSVで一括ロードしたい。
- 既存のタグ管理（TagMasterEditor）は手動追加・削除のみで、階層データの再利用やバックアップがしにくい。

## What Changes
- タグ階層を表形式CSVでインポートする機能（プレビュー＋適用）を追加し、重複/循環チェックとドライランを提供する。
- 現在のタグツリーを同一フォーマットでCSVエクスポートできるようにする。
- インポートモード（merge/replace）とオプション（非活性化/順序付け）をサポートし、結果サマリを返却するAPIとUIを用意する。

## Impact
- Affected specs: tag-management (拡張)
- Affected code (後続実装想定): タグ管理UI（TagMasterEditor付近）、タグAPI（CSVインポート/エクスポートエンドポイント）、パーサとバリデーション
