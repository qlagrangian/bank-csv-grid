# Tasks

## 1. AggregatePanel表示領域拡大
- [x] 1.1 `AggregatePanel.tsx:240`のグリッド高さを`h-[520px]`から`h-[2080px]`に変更
- [x] 1.2 ブラウザで表示を確認し、スクロール可能で全データが閲覧できることを検証

## 2. TagMasterEditorのCSV Import/Export UI改善
- [x] 2.1 AccordionContentのCSVセクション（lines 199-283）にスタイル改善を適用
- [x] 2.2 Export見出しを`<h4>`タグで明示し、フォント太字・サイズ調整
- [x] 2.3 Import見出しを`<h4>`タグで明示し、ExportとImportの間に`<hr>`で境界線追加
- [x] 2.4 各ステップ（1. ファイル選択、2. モード選択、3. 実行）に`<Label>`で見出しを追加し、階層構造を視覚化
- [x] 2.5 ブラウザで表示を確認し、セクション境界が明確で操作フローが分かりやすいことを検証

## 3. 動作確認
- [x] 3.1 `npm run dev`で開発サーバーを起動し、AggregatePanelの表示領域が拡大されていることを確認
- [x] 3.2 TagMasterEditorのCSV Import/Exportセクションが視覚的に改善されていることを確認
- [x] 3.3 既存機能（展開/折りたたみ、CSV操作）に影響がないことを確認
