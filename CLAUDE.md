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

## Development Commands

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