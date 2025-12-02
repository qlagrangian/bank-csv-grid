# PDF Import / CSV Extractor (Standalone)

PDF財務諸表から表を抽出し、CSVとして取得するための最小構成プロジェクトです。`feature/dev-import-1` で開発した機能を単独で動かせるように切り出しています。

## 構成
- `client/` React + Vite + Tailwind。`/` 直下で PDF インポート画面を表示。
- `server/` Hono + Gemini API。`POST /api/extract-csv` のみ提供。
- 付属: `src/vendor/react-pdf-ner-annotator/`（ビルド済みAnnotator）、サンプルPDF `client/public/pdfsample-02.pdf`。

## 前提
- Node.js 18+（undici対応 + fetch/FormDataサポート）
- Gemini APIキー（`GEMINI_API_KEY`）

## セットアップ & 起動
### server
```bash
cd pdf-import-standalone/server
cp .env.example .env   # GEMINI_API_KEY を設定
npm install
npm run dev            # http://localhost:3001
```

### client
```bash
cd pdf-import-standalone/client
npm install
# APIのベースURLを変えたい場合は .env に VITE_API_BASE を設定（デフォルト http://localhost:3001）
npm run dev            # http://localhost:5173
```

## 使い方
1. ブラウザで `http://localhost:5173` を開く。
2. PDFをアップロード。
3. モードを選択:
   - ページ選択: チェックリスト/クリック/入力で対象ページを指定。
   - 範囲選択: PDF上をドラッグして矩形を作成（リストで削除・プレビュー可）。
4. 「テーブル抽出を実行」でサーバにPOST。結果は画面に表形式で表示し、コピー/CSVダウンロード可能。

## 主要ファイル（client）
- `src/pages/PDFImportPage.tsx` — アップロードと結果表示。
- `src/components/CSVExtractor.tsx` — ページ/範囲選択と API 呼び出し（`VITE_API_BASE` を参照）。
- `src/utils/extractPDFTextMap.ts` — pdfjs-dist で textMap 抽出。
- `src/types/pdfjs-dist.d.ts` — PDF.js 型補完。
- `src/vendor/react-pdf-ner-annotator/**` — Annotator ビルド成果物。

## 主要ファイル（server）
- `src/index.ts` — `POST /api/extract-csv` 実装。Gemini へ PDF/テキストマップ/範囲情報を送信し、`{ results: Record<title, csv> }` を返す。  
  - 環境変数: `GEMINI_API_KEY`（必須）、`GEMINI_MODEL`（任意、デフォルト `gemini-2.5-flash`）、`PORT`（デフォルト 3001）。
  - モード: `page`（PDF + pages + textMap 必須）、`range`（ranges 必須、PDFは任意）。

## 注意・既知のポイント
- Geminiへの到達に失敗すると 500/400 が返る。`.env` を確認し、サーバログを参照。
- Annotatorはビルド済みを同梱。ソース改変が必要な場合は別途ビルド環境を用意すること。  
- スタイルはTailwind依存。必要に応じて `tailwind.config.js` や `src/index.css` を調整。
