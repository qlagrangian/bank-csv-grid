Purpose: Next.js app to import bank CSVs, tag transactions, view/edit in a React-Data-Grid, and aggregate/export data. Includes API routes with Prisma, simple UI components, and utilities for parsing/aggregation.
Tech stack: Next.js 15, React 18, TypeScript, Tailwind-based UI, Radix UI select, react-data-grid 7 beta, SWR, Prisma (SQLite/Postgres), Jest.
Structure: 
- src/app: Next.js app routes and pages
- src/components: UI components (TransactionGrid, FileImporter, AggregatePanel, TagMasterEditor)
- src/utils: parsing, grid defaults, aggregation (aggregateStatement), columns
- src/types: domain types (transaction, bank), RDG helper types
- src/app/api: REST endpoints for transactions/tags/export
- prisma/: schema, migrations, seed
Conventions: function components with 'use client' where needed, RDG configured with defaultColumnOptions, Tailwind classes for styling, minimal inline comments, types exported from utils/types.
Notes: Aggregate options (dropZero, tagless detection) are configurable in AggregatePanel UI.