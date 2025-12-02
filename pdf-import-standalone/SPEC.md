# PDF Import / CSV Extractor 厳密仕様（Standalone, 2025-11-29）

## 機能概要
- PDFに含まれる財務表をCSVとして抽出する。
- 抽出モード
  - **page**: 指定ページ全体を対象にAIへ送信（PDFファイル + pages + textMap）。
  - **range**: PDF上でドラッグした矩形単位で抽出（画像/テキスト/座標情報を送信）。PDFファイルは送らない。

## クライアント（`client/`）
- 技術: React + Vite + Tailwind。APIは `VITE_API_BASE`（デフォルト `http://localhost:3001`）を参照。
- 主要UIフロー
  1. PDFアップロード → `ArrayBuffer` を保持。
  2. モード選択（page/range）。
  3. page: チェックリスト/入力/ビューワクリックでページ選択 → textMap を `getTextMap` で生成。
  4. range: Annotator上でドラッグして範囲生成 → サムネイル/削除/プレビュー。
  5. 抽出実行: FormData で `/api/extract-csv` に POST → 結果を表形式表示、コピー/CSVダウンロード可能。
- 主ファイル
  - `src/pages/PDFImportPage.tsx` — アップロード/結果表示。
  - `src/components/CSVExtractor.tsx`
    - Annotator描画（`src/vendor/react-pdf-ner-annotator`）。
    - page: `getTextMap`で textMap を作成し、PDFを添付してPOST。
    - range: bbox/pdfInfo/範囲内テキスト/base64画像をJSON化してPOST。
    - `VITE_API_BASE` を参照して API に送信。
  - `src/utils/extractPDFTextMap.ts` — pdfjs-dist でページごとのテキストを取得。
  - `src/types/pdfjs-dist.d.ts` — PDF.js 型定義。
  - `src/vendor/react-pdf-ner-annotator/**` — ビルド済み Annotator（スタイル含む）。
  - サンプルPDF: `public/pdfsample-02.pdf`

## サーバ（`server/`）
- 技術: Hono + @google/generative-ai + Zod。`PORT`（デフォルト 3001）。
- 環境変数: `GEMINI_API_KEY`（必須）、`GEMINI_MODEL`（任意）、`PORT`。
- エンドポイント
  - `POST /api/extract-csv` (FormData)
    - 共通: `mode` (`page`|`range`), `prompt` (任意追記)。
    - **pageモード**: `file` (PDF必須), `pages` (JSON array, 1始まり), `textMap` (JSON: `{ pages: { "1": "...", ... } }`)。
    - **rangeモード**: `ranges` (JSON array) with items:
      - `page` (number, required)
      - `bbox` ({ left, top, width, height }, required)
      - `pdf` ({ width, height, scale }, optional)
      - `text` (範囲内テキスト, optional)
      - `image` (data URL, optional)
    - バリデーション: Zod superRefine（modeに応じて必須チェック）。
    - 処理:
      1. モード別にAIプロンプトを組み立て（数値カンマ除去指示付き）。
      2. pageモードは PDF を base64 で添付し、pages/textMap を追記。
      3. rangeモードは各範囲の画像/メタ情報/テキストをパーツとして添付。
      4. Gemini `responseMimeType='application/json'` + responseSchema を指定。
      5. 応答を `{ results: Record<title, csv> }` に整形し返却。`model` と token usage を付与。
    - 代表的なエラー: 400 (バリデーション/欠損), 500 (Gemini応答パース失敗、API到達不可等)。

## ビルド・起動
- client: `npm install && npm run dev` (port 5173)
- server: `cp .env.example .env` → `npm install && npm run dev` (port 3001)
- APIベースURL変更: client の `.env` に `VITE_API_BASE` を設定。

## 依存関係（必要最小）
- client: react, react-dom, pdfjs-dist, tailwindcss (+ postcss/autoprefixer), vite, typescript
- server: @google/generative-ai, hono, @hono/node-server, zod, dotenv

## 既知の注意点
- Geminiキー未設定/到達不可時は 500/400。ログで確認。
- Annotatorはビルド済みを同梱。ソース改変が必要な場合、別途ビルドパイプライン（未同梱）で再生成が必要。
- tailwindクラス依存のため、スタイルを大きく変える場合は Tailwind 設定を見直すこと。

## データフロー要約
1. ブラウザでPDFアップロード → ArrayBuffer を保持。
2. page: textMap を生成し、PDF + pages + textMap を FormData で送信。range: bbox/pdfInfo/テキスト/画像をJSON化して送信。
3. サーバが Gemini にプロンプト/バイナリ/メタ情報を送信。
4. Gemini 応答（JSON）の `results` をタイトル→CSVのMapに整形。
5. クライアントが結果をテーブル表示し、コピー/CSVダウンロードを提供。
