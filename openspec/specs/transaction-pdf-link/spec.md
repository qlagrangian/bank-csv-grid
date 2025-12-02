# transaction-pdf-link Specification

## Purpose
TBD - created by archiving change link-pdf-statements. Update Purpose after archive.
## Requirements
### Requirement: TransactionGridからのPDF明細割当起動
TransactionGridの各行には「PDF明細割当」ボタンを表示しなければならない（SHALL）。ボタンを押下すると pdf-import 画面へ遷移し、親行の `id`・`bank`・`date` を渡さなければならない（SHALL）。

#### Scenario: 任意行からpdf-importへ遷移
- **GIVEN** 銀行明細行 (id=`UUID`, bank=`gmo`, date=`2024/11/30`) がグリッドに表示されている
- **WHEN** ユーザーが「PDF明細割当」を押す
- **THEN** pdf-import 画面が開き、親メタとして `UUID`, `gmo`, `2024/11/30` が渡されている

### Requirement: 紐付け結果の反映とDeactivate
pdf-importからの紐付け結果を受け取ったら、親行をDeactivate（タグ編集不可）にし、元位置に子行を挿入しなければならない（SHALL）。親行の「PDF明細割当」ボタンはDeactivate後も押下可能でなければならない（SHALL）。子行は視覚的に区別できる色（薄い青系）で表示しなければならない（SHALL）。

#### Scenario: 親行の子行挿入と再紐付け可能状態
- **GIVEN** 親行 id=`UUID` の紐付け結果として2行の子明細を受信している
- **WHEN** 反映を行う
- **THEN** 親行はタグ編集不可となり、直後に子行2件が挿入され、子行は薄い青系で表示される
- **AND** 親行の「PDF明細割当」ボタンは引き続き押下可能である

### Requirement: 再紐付けと連番ID置換ルール
再度「PDF明細割当」を実行した場合、同じ親IDをプレフィックスに持つ既存子行を削除し、新しく受信した子行に置き換えなければならない（SHALL）。子行に対して「PDF明細割当」を実行した場合、その子行IDを親として `-001` 連番を付与した孫行IDを生成しなければならない（SHALL）。

#### Scenario: 親行の再紐付け
- **GIVEN** 親行 id=`UUID` に対して既に `UUID-001`, `UUID-002` の子行が表示されている
- **WHEN** ユーザーが親行の「PDF明細割当」を再度実行し、新しい子行3件を受信する
- **THEN** 既存の `UUID-` で始まる子行は削除され、新たに `UUID-001` 〜 `UUID-003` の3件が挿入される

#### Scenario: 子行に対する再紐付け
- **GIVEN** 子行 id=`UUID-002` が表示されている
- **WHEN** ユーザーが `UUID-002` 行の「PDF明細割当」を実行し、孫行2件を受信する
- **THEN** `UUID-002-001` と `UUID-002-002` の孫行が `UUID-002` の直後に挿入される

