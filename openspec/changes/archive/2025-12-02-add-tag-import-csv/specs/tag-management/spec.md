## ADDED Requirements
### Requirement: タグCSVインポート（プレビューと適用）
システムはタグ階層をCSVでインポートできなければならない（SHALL）。CSVはLevel列で階層を表現し（左から親→子）、ヘッダー必須・UTF-8であること（SHALL）。インポート前にプレビュー（dry-run）を提供し、重複・循環・欠損・深さ超過などのエラーをユーザーに通知しなければならない（SHALL）。適用はmerge/replaceモードを選択でき、結果サマリ（作成/更新/スキップ/警告/エラー件数）を返さなければならない（SHALL）。

#### Scenario: CSVインポートのプレビューと適用
- **GIVEN** ヘッダー `Level1,Level2,Level3,Order,Active` を持つUTF-8 CSVファイルが用意されている
- **WHEN** ユーザーがインポート画面でファイルを選択し、プレビュー（dry-run）を実行する
- **THEN** システムは階層を解釈し、エラーがあれば行番号付きで表示する
- **AND** ユーザーがmergeまたはreplaceを選択して適用すると、結果サマリが表示される

### Requirement: タグCSVエクスポート
システムは現在のタグ階層をインポートと同一フォーマットのCSVでダウンロードできなければならない（SHALL）。Level列は最大深さ分を出力し、OrderとActiveも列として含めなければならない（SHALL）。

#### Scenario: 現在のタグ階層をCSVとして取得
- **GIVEN** タグツリーに複数階層のタグが登録されている
- **WHEN** ユーザーがエクスポート操作を行う
- **THEN** システムはUTF-8のCSVを返し、各タグが適切なLevel列に出力され、OrderとActiveの値も含まれる
