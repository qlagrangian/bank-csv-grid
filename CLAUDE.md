<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->



# CLAUDE.md
** THINK IN ENFLISH, BUT INTERFACE WITH THE USER IN JAPANESE.**


This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **bank CSV transaction management system** built with Next.js 15 (App Router). It imports CSV files from multiple Japanese banks, normalizes the data, allows tagging transactions with hierarchical tags, and exports formatted reports. The system uses PostgreSQL via Prisma for data persistence.

**Companion Tool - PDF Import**: The `pdf-import-standalone/` directory contains a standalone tool for extracting detailed transaction records from PDF statements (credit card statements, bulk transfer statements) using Gemini Vision API. This enables breaking down aggregated bank CSV records into their detailed components.

## Development Commands

### Main Application

```bash
# Install dependencies
npm install

# Development server (runs on http://localhost:3000)
npm run dev

# Build for production (note: --no-lint flag is used)
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Clean build artifacts
npm run clean

# Database operations
npx prisma generate          # Generate Prisma client
npx prisma migrate deploy    # Apply migrations
npx prisma db seed          # Seed database with sample data
npx prisma migrate status    # Check migration status
npx prisma migrate reset     # Reset database (local only, destructive)
```

### PDF Import Standalone

See the [PDF Import Standalone](#pdf-import-standalone-pdf-import-standalone) section for detailed setup and usage instructions. Quick start:

```bash
# Server (port 3001)
cd pdf-import-standalone/server && npm install && npm run dev

# Client (port 5173)
cd pdf-import-standalone/client && npm install && npm run dev
```

## Architecture

### Core Data Flow

1. **CSV Import**: User uploads bank CSV → `FileImporter` component → `useCsvParse` hook → bank-specific converter (in `src/converters/`) → `TransactionRow[]`
2. **Transaction Display**: `useTransactions` hook fetches data via `/api/transactions?bank=X` → `TransactionGrid` displays in react-data-grid
3. **Tagging**: User assigns hierarchical tags → stored via `TagAssignment` model → paths displayed as "Parent>Child>GrandChild"
4. **Persistence**: Bulk register via `/api/transactions/bulk-register` → Prisma inserts into PostgreSQL

### Bank Converter Pattern

Each supported bank has a converter in `src/converters/`:
- `gmo.ts` - GMO あおぞら銀行
- `sbi.ts` - SBI銀行
- `paypay.ts` - PayPay銀行
- `mizuho-ebiz.ts` - みずほe-ビジネスサイト
- `mizuho-bizweb.ts` - みずほビジネスWEB

**Adding a new bank converter:**
1. Create `src/converters/newbank.ts` with:
   - `BANK_CODE` constant (must match BankCode union type)
   - Zod schema matching CSV headers
   - `convertNewBank(raw: Record<string, string>): TransactionRow` function
   - Parse dates to `YYYY/M/D` format (not zero-padded)
   - Use `parseYen()` for currency fields (handles "1,234" → 1234)
2. Update `src/types/bank.ts` to add new bank code to `BankCode` union
3. Register in `src/converters/index.ts` registry object

### Database Schema (Prisma)

**Transaction** - Core transaction data
- Fields: `id`, `bank`, `date`, `description`, `credit`, `debit`, `balance`, `memo`, `tag` (deprecated in favor of TagAssignment)
- Note: The `tag` column exists but is superseded by the TagAssignment relationship

**Tag** - Hierarchical tag system
- Self-referential with `parent`/`children` relations
- Unique constraint on `[parentId, name]`

**TagAssignment** - Many-to-many between Transaction and Tag
- Unique constraint on `[transactionId, tagId]`
- Used to build tag paths like "Income>Salary>Base"

### Key Types

**TransactionRow** (`src/types/transaction.ts`):
- `date`: string in `YYYY/M/D` format (frontend representation)
- `tag`: string with hierarchy path like "Parent>Child"
- `tagIds`: array of selected tag IDs (client-side only for unregistered rows)
- `isRegistered`: boolean indicating if persisted to DB
- `isDirty`: client-side flag for unsaved changes

**BankCode** (`src/types/bank.ts`): Union of supported bank identifiers

### Frontend Architecture

- **State Management**: SWR for server state, Zustand for client state
- **Grid**: react-data-grid for transaction editing
- **Forms**: Custom hooks for CSV parsing, transaction management, tag editing
- **API Routes**: Next.js App Router API routes in `src/app/api/`

### Date Handling

- **Frontend**: Dates are strings in `YYYY/M/D` format (not zero-padded)
- **Converters**: Parse bank-specific formats (e.g., "20240401") to `YYYY/M/D`
- **API Layer**: Convert strings to `Date` objects when saving via `new Date(row.date)`
- **Database**: Stored as PostgreSQL `TIMESTAMP` via Prisma `DateTime`
- **API Response**: Convert `Date` back to `YYYY/MM/DD` via `toISOString().slice(0,10).replace(/-/g,'/')`

### Tag System

Tags support hierarchy with unlimited nesting. The UI displays full paths:
- Tags are stored separately in `Tag` model
- `TagAssignment` creates the many-to-many relationship
- Frontend builds paths by traversing `parent` references
- Display format: "Level1>Level2>Level3"

## API Endpoints

**Tags**
- `GET /api/tags` - List all tags
- `POST /api/tags` - Create tag (body: `{name, parentId?, order?}`)
- `PATCH /api/tags` - Update tag (body: `{id, name}`)
- `DELETE /api/tags?id=X` - Delete tag

**Transactions**
- `GET /api/transactions?bank=X` - Get transactions for bank
- `GET /api/transactions/all` - Get all transactions
- `POST /api/transactions/bulk-register` - Register new transactions (body: `TransactionRow[]`)
- `PATCH /api/transactions/bulk-tag` - Update tags for multiple transactions
- `PATCH /api/transactions/[id]` - Update single transaction
- `PATCH /api/transactions/[id]/tags` - Update tags for transaction

**Export**
- `GET /api/export?bank=X&format=Y` - Export transactions

**Report**
- `GET /api/report` - Generate aggregated report

## PDF Import Standalone (`pdf-import-standalone/`)

### Overview

A standalone React + Hono application for extracting tabular data (BS/PL/transaction details) from PDF documents using Gemini Vision API. This tool addresses the limitation where bank CSVs aggregate multiple transactions (e.g., credit card charges, bulk transfers) into single records.

**Use Case**: When a bank CSV shows a single record for "Credit Card Payment -50,000 yen", the actual PDF statement contains itemized transactions. This tool extracts those details to create a complete transaction breakdown.

### Architecture

**Client** (`pdf-import-standalone/client/`)
- React + Vite + Tailwind CSS
- PDF annotation UI via `react-pdf-ner-annotator` (vendored build)
- Two extraction modes:
  - **Page mode**: Select entire PDF pages → sends PDF file + page numbers + text map to API
  - **Range mode**: Draw bounding boxes on PDF → sends cropped images + coordinates + extracted text
- Results displayed as tables with copy/CSV download functionality

**Server** (`pdf-import-standalone/server/`)
- Hono framework with single endpoint: `POST /api/extract-csv`
- Gemini Vision API integration (requires `GEMINI_API_KEY`)
- Default model: `gemini-2.5-flash` (configurable via `GEMINI_MODEL`)
- Returns structured JSON: `{ results: Record<title, csv> }`

### Setup & Usage

**Prerequisites:**
- Node.js 18+
- Gemini API key

**Server setup:**
```bash
cd pdf-import-standalone/server
cp .env.example .env   # Set GEMINI_API_KEY
npm install
npm run dev            # Runs on http://localhost:3001
```

**Client setup:**
```bash
cd pdf-import-standalone/client
npm install
npm run dev            # Runs on http://localhost:5173
# Set VITE_API_BASE in .env to change API endpoint (default: http://localhost:3001)
```

**Workflow:**
1. Upload PDF at `http://localhost:5173`
2. Choose extraction mode (page/range)
3. Select target pages or draw bounding boxes
4. Click "Extract Table" to send to Gemini API
5. View results in table format, copy or download as CSV

### Key Files

**Client:**
- `src/pages/PDFImportPage.tsx` - Main upload and results display
- `src/components/CSVExtractor.tsx` - Page/range selection and API communication
- `src/utils/extractPDFTextMap.ts` - Text extraction using pdfjs-dist
- `src/vendor/react-pdf-ner-annotator/` - Pre-built PDF annotation component

**Server:**
- `src/index.ts` - API endpoint implementation with Gemini integration
- Environment variables: `GEMINI_API_KEY` (required), `GEMINI_MODEL` (optional), `PORT` (default 3001)

### API Specification

**POST /api/extract-csv** (FormData)

Common parameters:
- `mode`: `"page"` | `"range"`
- `prompt`: Optional additional instructions for Gemini

**Page mode:**
- `file`: PDF file (required)
- `pages`: JSON array of page numbers (1-indexed)
- `textMap`: JSON object `{ pages: { "1": "text...", ... } }`

**Range mode:**
- `ranges`: JSON array of objects with:
  - `page`: number (required)
  - `bbox`: { left, top, width, height } (required)
  - `pdf`: { width, height, scale } (optional)
  - `text`: extracted text within range (optional)
  - `image`: base64 data URL of cropped area (optional)

Response: `{ results: Record<title, csv>, model: string, usage: {...} }`

### Integration with Main Project

**Future Integration Path:**
1. Add `Transaction.pdfStatementId` field to link aggregated records to PDF statements
2. Create `/api/transactions/[id]/pdf-details` endpoint to display extracted PDF data
3. UI enhancement: Show expandable detail rows in TransactionGrid for records with PDF attachments
4. Import extracted CSV data as child transactions linked to parent aggregated record

**Current Status:** Standalone tool - not yet integrated with main transaction system

### Technical Notes

- **PDF Processing**: Uses pdfjs-dist for client-side text extraction
- **Vision API Prompts**: Currently optimized for financial statements (BS/PL), can be adapted for transaction lists by modifying server prompts
- **Annotator**: react-pdf-ner-annotator is vendored as pre-built CJS, configured in Vite with `optimizeDeps.include` for ESM compatibility
- **Image Handling**: Range mode captures bbox screenshots as base64 data URLs for precise extraction

## Important Implementation Notes

1. **CSV Parsing**: Uses PapaParse with `encoding: 'Shift_JIS'` for Japanese bank CSVs
2. **Unique IDs**: New transactions use `nanoid()` on client before registration, replaced by `cuid()` in database
3. **Build Configuration**: Build uses `--no-lint` flag to skip linting during build
4. **Client Components**: Most UI components require `'use client'` directive
5. **Webpack Config**: Custom CSS loader config for esModule compatibility
6. **Path Aliases**: `@/*` maps to `src/*` (configured in tsconfig.json)
7. **Postbuild**: Prisma client generation happens in postbuild script

## Testing

- Test framework: Jest with jsdom environment
- Test configuration: `jest.config.ts` uses `next/jest` preset
- Component tests use `@testing-library/react`
- Run tests with `npm test`

## Common Patterns

**Adding a new transaction source:**
1. Create converter following the pattern in `src/converters/`
2. Add bank code to `BankCode` type
3. Register converter in `src/converters/index.ts`
4. Converter must return `TransactionRow` with `isRegistered: false`

**Adding a new API endpoint:**
1. Create route handler in `src/app/api/[path]/route.ts`
2. Use `prisma` from `@/lib/prisma`
3. Return `NextResponse.json(data)`
4. Handle errors with appropriate status codes

**Working with tags:**
- Always use TagAssignment for new implementations
- The Transaction.tag column is legacy and should not be used for new features
- Build full tag paths by traversing parent relationships
- Format as "Parent>Child>GrandChild"

## UI/UX Features

### タグツリー（Tag Master Editor）のキーボード操作

**基本操作:**
- **ENTERキー**: タグレコード選択時にENTERを押すと、右側の「子タグ名」入力フィールドに自動フォーカス
- **ダブルクリック**: タグレコードをダブルクリックすると、名称変更モードに入る（ENTERキーでは名称変更モードに入らない）
- **矢印キー**:
  - 右矢印（→）: 子科目を展開
  - 左矢印（←）: 子科目を折りたたむ

**子タグ追加フロー:**
1. タグレコードを選択してENTERを押す → 子タグ名入力フィールドにフォーカス
2. タグ名を入力してENTERを押す → 「追加」ボタンにフォーカス移動
3. 「追加」ボタンにフォーカスがある状態でENTERを押す → 子タグが追加される

**視覚的改善:**
- 階層レベルに応じたインデント表示（16px per level）
- 展開/折りたたみボタンは境界線・背景色・ホバー効果付き
- 階層構造が一目で把握できる罫線表示

### タグ割り当て（Transaction Grid）の操作

**編集可能性:**
- 未割り当て、Pending（黄色）、DB登録済み（緑色）すべてのタグセルが編集可能
- ダブルクリックまたはENTERキーでタグ割り当てポップアップを開く

**Pending状態管理:**
- タグ割り当て・編集時は即座にDBに反映せず、Pending状態（黄色表示）になる
- DB登録済み（緑色）のタグを編集すると、再度Pending状態（黄色）に戻る
- 「内部勘定反映」ボタンを押すまでDB反映を保留
- ボタン押下時に、新規行とタグ変更行を一括でDBに保存し、緑色（登録済み）に変わる

**タグ割り当てポップアップ:**
- 画面中央に固定表示（スクロール位置に関わらず常に中央）
- ENTERキーで選択中のタグを確定（検索入力・階層列・検索結果すべてで対応）
- タグ選択してENTERを押すとポップアップが自動的に閉じる
- 画面サイズに応じて自動的にサイズ調整
- 最大幅: 画面幅の95%、最大高さ: 画面高さの90%