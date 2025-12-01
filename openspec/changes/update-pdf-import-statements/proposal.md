# Change: Update PDF Import for Transfer/Card Statements

## Why
- 現行のPDF抽出はBS/PL前提のプロンプトで、総合振込明細・カード利用明細に特化した出力要件を満たしていない。
- docs/01_prp.md で定義された明細別の出力フォーマット（bank-csv-gridの取引グリッドに直挿入可能な形）を実現する必要がある。

## What Changes
- 抽出対象タイプを「総合振込明細」「カード利用明細」から選択できるUI/フローを追加し、タイプごとにプロンプトを切り替える。
- 抽出時に銀行（支払口座/引落口座）選択を受け取り、出力の銀行カラムへ反映する。
- 出力のマッピングルールを明細タイプ別に固定化（内容テキスト結合、入金0固定、出金の金額抽出ルール、メモ固定など）。
- 既存のpage/rangeモードを維持しつつ、抽出結果を bank-csv-grid のグリッド列構造に揃えたCSVとして返す。

## Impact
- Affected specs: pdf-import（新規）
- Affected code: pdf-import-standalone client (モード/銀行選択UI・送信パラメータ), server (Geminiプロンプト・出力整形)
