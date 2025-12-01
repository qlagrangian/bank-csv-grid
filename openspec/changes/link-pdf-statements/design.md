## Context
- 目的: TransactionGrid の各取引行から PDF 抽出画面へ遷移し、親行メタ (id/bank/date) を引き継いだ子明細を生成・反映する動線を追加する。
- 既存: pdf-import-standalone は抽出用 (page/range) と CSV返却まで対応済み。bank-csv-grid は `TransactionRow` (id, bank, date, description, credit/debit...) を扱い、API `/api/transactions` 系でDB操作。
- 要求 (docs/02_prp.md): 親行IDに `-001` 連番を付与した子行ID、銀行/取引日自動セット、紐付け実行で親をDeactivateし子行を挿入、再紐付けで置換、子行に対する再紐付けはさらに `-001` 付与。

## Goals / Non-Goals
- Goals: 親メタの受渡し方式を決める、ID採番/置換ルールを明文化、紐付けPOSTのAPI契約とオリジン方針を定める。
- Non-Goals: PDF抽出ロジック自体の精度改善（前回の抽出仕様は変更しない）。

## Decisions
- 親メタ受渡し: TransactionGrid → pdf-import へはクエリパラメータ (id, bank, date) で渡す。pdf-importは表示用に保持し、編集不可とする。
- ID採番: 親IDに対し子行は `parentId-001` からの連番。既存プレフィックスを持つ行に対して再紐付けする場合は、その行IDを親として再度 `-001` 連番を付ける（例: `UUID-001` の子は `UUID-001-001`）。
- 置換ルール: 親IDをキーに、既に挿入済みの子行（IDが `parentId-` で始まるもの）は再紐付け時に全削除して新しい子行で置換する。親がDeactivateされた状態でも「PDF明細割当」ボタンは有効。
- 反映API: pdf-import から bank-csv-grid の新設APIへ `parentId`, `parentBank`, `parentDate`, `rows[]` (id, bank, date, description, credit, debit, balance, memo) をPOST。レスポンスで反映結果/エラーを返す。
- オリジン/CORS: 開発時は http://localhost:5173 → http://localhost:3000 のクロスオリジンとなるため、新APIに限定したCORS許可を検討。将来同一オリジンに統合する余地は残す。
- UI表示: pdf-import の結果テーブルに ID列を追加し、親メタの固定表示を行う。紐付け実行後は成功/失敗を明示する。
- Deactivate表現: 親行はタグ編集不可＋色を薄い青系表示。再紐付け時は子行を置換し、Deactivate状態は維持。

## Risks / Trade-offs
- IDを文字列連結に依存するため、既存IDに `-` を含む場合の扱いが曖昧→採番ロジックで末尾に3桁連番を追加する明確な正規化を行う。
- クロスオリジンPOSTのため、CORS設定忘れによる送信失敗リスク→API側でOrigin限定許可を実装。
- 既存DBに親子関係のカラムがない→IDプレフィックスで管理するため、クエリや削除ロジックが文字列前方一致になる。必要に応じて後続で親IDカラム追加を検討（今回は非Goal）。

## Open Questions
- 本番ホスト時のオリジンは同一か別ドメインか。→ 確認してCORS/URL決定が必要。
- 親行/子行の表示順: 親行位置に子行を「展開表示」するか、行順をどう制御するか（例: 親の次に子を挿入）。→ 実装時にUI要件を確定させる。*** End Patch
