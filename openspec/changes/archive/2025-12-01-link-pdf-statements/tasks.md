## 1. Implementation
- [x] 1.1 設計: 親行メタの受渡し方法（クエリ/params）、ID採番ルール、紐付けPOSTのAPI契約、CORS/同一オリジン方針を決定しdesign.mdに記載する
- [x] 1.2 TransactionGridに「PDF明細割当」列を追加し、全行からpdf-import画面へ親ID/銀行/取引日を渡して遷移できるようにする
- [x] 1.3 pdf-import側で親メタを初期表示・固定し、抽出結果に銀行/取引日を自動セット、IDを`親ID-001`連番で生成し、UIにID列を表示する
- [x] 1.4 「紐付け実行」で親ID・生成行をbank-csv-grid APIへ送信する処理とエラー表示を実装する（page/range両モードで共通）
- [x] 1.5 bank-csv-grid側で受信APIを追加し、親行のDeactivate + 子行挿入（色付け、タグ編集禁止、連番置換/再紐付け対応）を行い、再紐付け時の置換/ネストID付与を保証する
- [x] 1.6 テスト/検証: 親・子・再紐付け（置換/ネスト）シナリオとAPIバリデーション、`npx openspec validate link-pdf-statements --strict`
