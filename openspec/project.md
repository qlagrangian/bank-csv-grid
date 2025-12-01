# Project Context

## Purpose
複数の日本の銀行から取引明細CSVをインポートし、正規化・タグ付け・レポート出力を行う銀行取引管理システム。
階層的なタグシステムを使用して取引を分類し、PostgreSQLで永続化。

**主な機能:**
- 複数銀行のCSV形式に対応したインポート機能
- 取引データの一元管理とグリッド表示
- 階層的タグによる取引の分類・検索
- カスタマイズ可能なレポート出力
- **PDF明細抽出** (`pdf-import-standalone/`): クレジットカードや総合振込のPDF明細から詳細レコードを抽出するスタンドアロンツール

## Tech Stack

### Main Application
- **Frontend**: Next.js 15 (App Router), React, TypeScript
- **UI Components**: react-data-grid (取引グリッド), カスタムコンポーネント
- **State Management**: SWR (サーバー状態), Zustand (クライアント状態)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **CSV Parsing**: PapaParse (Shift_JIS対応)
- **Testing**: Jest + @testing-library/react (jsdom環境)
- **ID Generation**: nanoid (クライアント), cuid (サーバー)

### PDF Import Standalone (`pdf-import-standalone/`)
- **Client**: React + Vite + Tailwind CSS
- **Server**: Hono + @google/generative-ai (Gemini Vision API)
- **PDF Processing**: pdfjs-dist (テキスト抽出)
- **Annotation**: react-pdf-ner-annotator (ベンダー版、領域選択UI)
- **Purpose**: クレジットカード明細・総合振込明細PDFから詳細レコードをCSV抽出
- **Ports**: Server (3001), Client (5173)

## Project Conventions

### Code Style
- **Path Alias**: `@/*` → `src/*` (tsconfig.jsonで設定)
- **Client Components**: UIコンポーネントには `'use client'` ディレクティブを使用
- **Naming**:
  - Types: PascalCase (例: `TransactionRow`, `BankCode`)
  - Constants: UPPER_SNAKE_CASE (例: `BANK_CODE`)
  - Files: kebab-case (例: `bulk-register`, `mizuho-ebiz.ts`)
- **Build**: `--no-lint` フラグでビルド時のlintをスキップ
- **Import Order**: 外部ライブラリ → 内部モジュール → 型定義

### Architecture Patterns

#### Main Application

**レイヤー構造:**
```
CSV Input → Converter → TransactionRow → API Route → Prisma → PostgreSQL
                ↓
          react-data-grid ← SWR Hook ← API Endpoint
```

**Bank Converter Pattern:**
- 各銀行ごとに専用コンバーター (`src/converters/`)
- 必須要素: `BANK_CODE` 定数, Zodスキーマ, `convert*` 関数
- 出力: `TransactionRow` 型に正規化
- 日付形式: `YYYY/M/D` (ゼロパディングなし)
- 金額処理: `parseYen()` で "1,234" → 1234 変換

**API Route Pattern:**
- `src/app/api/[リソース]/route.ts`
- `prisma` は `@/lib/prisma` からimport
- レスポンス: `NextResponse.json(data)`
- エラーハンドリング: 適切なHTTPステータスコード使用

**Tag System:**
- 階層構造: 無制限のネスト対応
- 表示形式: "親>子>孫"
- データモデル: `Tag` (自己参照) + `TagAssignment` (多対多)
- **重要**: `Transaction.tag` カラムはレガシー、新機能では `TagAssignment` を使用

#### PDF Import Standalone

**データフロー:**
```
PDF Upload → Client (領域選択/ページ選択) → FormData → Server
                                                        ↓
                                              Gemini Vision API
                                                        ↓
                                         JSON (CSV形式の表データ)
                                                        ↓
                                         Client (表示・ダウンロード)
```

**抽出モード:**
- **Page mode**: 指定ページ全体 → PDF + pages + textMap を送信
- **Range mode**: 矩形選択領域 → 画像 + bbox + テキスト を送信

**統合パス (将来):**
1. `Transaction.pdfStatementId` でPDF明細とリンク
2. `/api/transactions/[id]/pdf-details` で詳細取得
3. TransactionGrid で展開表示
4. 抽出CSV → 子トランザクションとして登録

### Testing Strategy
- **Framework**: Jest with `next/jest` preset
- **Environment**: jsdom
- **Component Testing**: `@testing-library/react`
- **Run**: `npm test`
- **Coverage**: コンポーネント、hooks、converterを優先的にテスト

### Git Workflow
- **Main Branch**: `main`
- **PR Base**: `main` ブランチへマージ
- **Commit**: 機能単位でコミット
- **Branch Naming**: 機能名ベース (例: `002-pj-ses`, `tag-ui-rich`)

## Domain Context

**日本の銀行CSV取引明細:**
- 各銀行で独自のCSV形式を使用
- エンコーディング: Shift_JIS (UTF-8ではない)
- 日付形式: 銀行ごとに異なる (例: "20240401", "2024/04/01")
- 金額: カンマ区切り (例: "1,234")

**対応銀行:**
- GMO あおぞら銀行 (`gmo`)
- SBI銀行 (`sbi`)
- PayPay銀行 (`paypay`)
- みずほe-ビジネスサイト (`mizuho-ebiz`)
- みずほビジネスWEB (`mizuho-bizweb`)

**取引タグ分類:**
- 階層構造により収入/支出カテゴリを管理
- 例: "収入>給与>基本給", "支出>交通費>電車"
- 複数タグの同時付与が可能

## Important Constraints

**技術的制約:**
- CSV解析は必ず `encoding: 'Shift_JIS'` を使用
- 日付フォーマット統一: `YYYY/M/D` (ゼロパディングなし)
- 新規取引はクライアントで `nanoid()`、DB保存時に `cuid()` で置換
- Webpack CSS Loader: esModule互換性のためカスタム設定

**データ制約:**
- `Tag` の `[parentId, name]` はユニーク制約
- `TagAssignment` の `[transactionId, tagId]` はユニーク制約
- 日付は文字列として扱い、API層で `Date` オブジェクトに変換

**ビルド制約:**
- `npm run build` は `--no-lint` フラグ付きで実行
- Postbuild時に Prisma クライアント自動生成

## External Dependencies

### Main Application

**Database:**
- PostgreSQL (Prismaで接続)
- Migration: `npx prisma migrate deploy`
- Seed: `npx prisma db seed`

**Runtime Dependencies:**
- Next.js 15 App Router
- Prisma Client (自動生成)
- PapaParse (CSV解析)
- SWR (データフェッチング)

**Development Tools:**
- Prisma CLI (マイグレーション管理)
- Jest (テスト実行)
- TypeScript Compiler

### PDF Import Standalone

**External Services:**
- Gemini API (Google Generative AI) - 環境変数 `GEMINI_API_KEY` 必須

**Client Dependencies:**
- react, react-dom, pdfjs-dist
- tailwindcss, vite, typescript
- react-pdf-ner-annotator (vendored)

**Server Dependencies:**
- @google/generative-ai
- hono, @hono/node-server
- zod, dotenv
