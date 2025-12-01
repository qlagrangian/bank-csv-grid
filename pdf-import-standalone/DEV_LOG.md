# 開発ログ（standalone切り出し時のトラブルシュート）

## 2025-11-29
- 事象: `Uncaught SyntaxError: ... does not provide an export named 'default'` / `exports is not defined`（Annotator読み込み時）。  
  - 原因: CJSビルドの Annotator を `src/` 直下からESMとして読み込んだため、Viteがプリバンドルせず、そのまま配信していた。
  - 対応:
    - `react-pdf-ner-annotator` をローカル依存（`file:src/vendor/react-pdf-ner-annotator`）として `node_modules` に配置。
    - `vite.config.ts` に `optimizeDeps.include`（Annotator/CSS）と `build.commonjsOptions`（CJS変換強制）を追加し、CJS→ESMラップを強制。
    - `CSVExtractor.tsx` の import をパッケージ名経由に変更。  
    - `npm install` → `npm run build` 成功を確認。
- 事象: favicon 404。  
  - 対応: `client/public/favicon.ico` を配置。

メモ: 上記以降は `npm run dev` で `/` を開き、PDFアップロード→page/range抽出が動作することを確認。***
