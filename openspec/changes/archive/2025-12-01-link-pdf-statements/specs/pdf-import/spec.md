## ADDED Requirements
### Requirement: 親明細メタの引き継ぎとID連番付与
pdf-importは親トランザクションの `id`・`bank`・`date` を受け取り表示しなければならない（SHALL）。抽出結果の各行には親の `bank` と `date` を自動でセットし（SHALL）、行IDは親IDに `-001` からの3桁連番を付与した文字列で生成しなければならない（SHALL）。

#### Scenario: 親ID付与と日付/銀行の自動セット
- **GIVEN** 親トランザクションIDが `UUID`、銀行が `sbi`、取引日が `2024/12/01` の行から遷移している
- **WHEN** PDF抽出を実行する
- **THEN** 生成される各行の `id` は `UUID-001`, `UUID-002`, ... のように連番が付与される
- **AND** 各行の `bank` は `sbi`、`date` は `2024/12/01` が自動でセットされる

### Requirement: 紐付け実行による子明細送信
pdf-importは「紐付け実行」操作で、親IDと生成した行（id, bank, date, description, credit, debit, balance, memo を含む）を bank-csv-grid の受入APIへ送信しなければならない（SHALL）。送信は抽出モード（page/range）に依存せず同一ペイロード形式を用い（SHALL）、エラー時はユーザーへ明示的に通知しなければならない（SHALL）。

#### Scenario: 紐付け実行の送信と通知
- **GIVEN** 抽出結果に2行が存在し、親IDが `UUID` である
- **WHEN** ユーザーが「紐付け実行」を押す
- **THEN** pdf-importは `parentId=UUID` と2行の明細をAPIへPOSTする
- **AND** APIが失敗した場合、エラーメッセージがUIに表示される
