# Change: Link PDF Statements to Transactions

## Why
- docs/02_prp.md にあるとおり、抽出したPDF明細を既存の銀行取引行へ紐付け、元行の代替として子行を挿入するフローが未整備。
- 現状はPDF抽出結果を取得するだけで、親トランザクションID・銀行・日付を引き継いだ子行生成や「紐付け実行」での反映動線がない。

## What Changes
- TransactionGrid に「PDF明細割当」列を追加し、全行からpdf-import画面へ遷移できるようにする（親行のID/銀行/取引日を渡す）。
- pdf-import 側で親メタ（ID/銀行/取引日）を受け取り、抽出結果の各行に銀行・取引日を自動セットし、IDは `親ID-001` 形式で連番付与する。
- 「紐付け実行」で抽出行をbank-csv-gridへ送信し、親行をDeactivate（タグ編集不可）しつつ子行を挿入・表示するフローを定義する。再実行時は既存子行を置換し、子行に対しても再紐付け（`親-子-001` 形式）を許容する。

## Impact
- Affected specs: pdf-import (拡張), 新規 capability (transaction-pdf-link)
- Affected code (後工程想定): TransactionGrid列追加・遷移処理, pdf-import client/serverのメタ受渡し/ID採番/リンク実行処理, bank-csv-grid側の受信API/反映ロジック
