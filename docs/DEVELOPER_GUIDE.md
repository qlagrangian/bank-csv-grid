# bank-csv-grid — Developer Guide

このドキュメントは、新しくプロジェクトに参加するエンジニア向けに、リポジトリの概要、開発環境のセットアップ方法、主要アーキテクチャ、主要コンポーネントと API の説明、テスト/シード手順などをまとめたものです。

**前提**

- Node.js と pnpm がインストールされていること（推奨 Node.js 18+）。
- PostgreSQL が利用可能で、環境変数 `DATABASE_URL` が設定されていること。

**主要技術スタック**

- フレームワーク: Next.js 15（App Router）
- UI: Tailwind CSS
- 型チェック: TypeScript
- DB: Prisma + PostgreSQL
- CSV 解析: `papaparse`
- 状態管理/データ取得: `swr`, `zustand`
- テスト: Jest, @testing-library/react

## セットアップ手順（ローカル）

1. リポジトリをクローン

```bash
git clone <repo> && cd bank-csv-grid
```

2. 依存関係をインストール（pnpm）

```bash
pnpm install
```

3. 環境変数を用意

- `DATABASE_URL` を設定（例: `postgresql://USER:PASSWORD@HOST:PORT/DBNAME`）

4. Prisma マイグレーションとシード

```bash
pnpm prisma migrate deploy
pnpm prisma db seed
```

5. 開発サーバー起動

```bash
pnpm dev
```

6. ブラウザで開く

- `http://localhost:3000` にアクセスして UI を確認します。

## ディレクトリ構成（主な部分）

- `src/app` — Next.js App Router のエントリ（ページ、API ルート）
  - `src/app/api/tags/route.ts` — タグ取得/作成/更新/削除 API
  - `src/app/api/transactions/*` — 取引データ取得、一括登録、一括タグ更新などの API
- `src/components` — 再利用可能な React コンポーネント
  - `FileImporter.tsx` — CSV ファイルのアップロードとパース起点
  - `TransactionGrid.tsx` — 取引を表示・編集するグリッド (react-data-grid)
  - `TagMasterEditor.tsx` — タグの CRUD UI
- `src/hooks` — カスタムフック（SWR を使った `useTags`, CSV パースの `useCsvParse` など）
- `src/lib` — ライブラリ/ユーティリティ（`prisma` クライアントなど）
- `src/utils` — アプリ固有のユーティリティとロジック（列定義、集計関数など）
- `prisma` — Prisma スキーマとシード

## 主要なデータフロー

- CSV をアップロードすると `useCsvParse` が選んだ `converters/*` を使って `TransactionRow[]` に変換します。
- `TransactionGrid` で編集（タグ付け等）し、UI 上で `bulk-register` や `bulk-tag` API に送信できます。
- タグは `src/app/api/tags` で管理され、`useTags` フックを通じて UI に反映されます。
- DB スキーマの主なモデル:
  - `Transaction`（取引）: `id, bank, date, description, credit, debit, balance, memo, tag, createdAt`
  - `Tag`: `id, name, createdAt, updatedAt`

## 主要コンポーネントとフックの要約

- `FileImporter` — ファイル入力 + 銀行種別選択。`useCsvParse` を呼び出して `TransactionRow[]` を返す。
- `TransactionGrid` — `react-data-grid` を使い、列は `src/utils/columns.tsx` にて定義。`onRowsChange` で編集反映。
- `TagMasterEditor` — タグの一覧表示、追加、編集、削除。内部で `useTags` を利用。
- `useTags` — `/api/tags` と通信する SWR フック。`addTag`, `editTag`, `deleteTag` を提供。

## 主要コンポーネントとフック（詳細）

- `src/components/FileImporter.tsx`

  - 役割: CSV ファイル選択と銀行種別選択の UI。選択されたファイルを `useCsvParse` に渡して `TransactionRow[]` を受け取る。
  - 重要点: `accept=".csv"` でファイル種別を制限。進捗は `Progress` コンポーネントで表示。

- `src/components/TransactionGrid.tsx`

  - 役割: `react-data-grid` を使い、取引行を表として表示・編集できるようにする。
  - 重要点: `buildColumns`（`src/utils/buildColumns.ts`）で列の定義・編集可否を制御。`rowKeyGetter` は `id` を利用。

- `src/components/TagMasterEditor.tsx`

  - 役割: タグマスタの CRUD を行う UI。`useTags` を使用して API と同期する。
  - 重要点: 入力の `onBlur` で編集を確定する設計。削除は `confirm()` で確認を行う。

- `src/hooks/useCsvParse.ts`

  - 役割: CSV の読み込みと行単位のパース。`converters/` の各銀行向けパーサを選択して `TransactionRow[]` を生成する。
  - 重要点: `PapaParse` を使用しており、行フィルタや日付・金額パースのロジックが含まれる。

- `src/hooks/useTags.ts`

  - 役割: タグ API のラッパー（SWR）。取得・追加・編集・削除の関数を提供する。
  - 重要点: API 呼び出し後に `mutate()` を呼んでローカルのキャッシュを更新する。

- `src/hooks/useTransactions.ts` (存在する場合)
  - 役割: 取引データの取得/更新のフローを抽象化する（一覧取得や一括更新を扱う）。

## API エンドポイント一覧とデータフロー詳細

- `GET /api/tags` — 登録済みタグを返す。`useTags` が利用。
- `POST /api/tags` — タグを作成。重複チェックあり。
- `PATCH /api/tags` — タグ名を編集（id 必須）。重複名チェックあり。
- `DELETE /api/tags?id=<id>` — クエリパラメータでタグ削除。

- `GET /api/transactions?bank=<bank>` — 指定銀行の取引を取得（`TransactionRow[]` へフォーマット）
- `GET /api/transactions/all` — 全銀行の取引を取得
- `POST /api/transactions/bulk-register` — `TransactionRow[]` を受け取り `Transaction` モデルへ一括登録（`createMany`）
- `PATCH /api/transactions/bulk-tag` — 複数行の `tag` を一括更新（トランザクション）
- `PATCH /api/transactions/[id]` — 指定行の `tag` を更新

データフロー:

- フロントで `TransactionRow` 型（`src/types/transaction.ts`）を扱い、日付は `YYYY/MM/DD` 形式の文字列で管理。
- バックエンドは日付を `Date` として保存するため、API 層で `new Date(r.date)` のように変換する。
- `tag` は文字列（タグ名）で保持され、`Tag` モデルの `name` と紐づけして表示・選択する実装がフロント側で行われる。

## 開発時に注意すべき点

- Next.js の App Router（Edge/Server Components）とクライアントコンポーネントの境界に注意すること。`'use client'` が付くファイルはクライアント側でのみ動作する。
- Prisma の `DateTime` 型はサーバーで `Date` オブジェクトとして扱われる。フロントでは文字列でやり取りしているため、変換が必要。
- `prisma.transaction.createMany` は `skipDuplicates` をサポートしているが、一部のユニーク制約に依存するため期待通り動かない場合がある。

## テスト & リント

- テスト
  - `pnpm test` (Jest)
- リント
  - `pnpm lint`

## よく見るファイルの説明（短）

- `src/lib/prisma.ts` — PrismaClient を作成してエクスポート。Edge/SSR 環境向けに再利用される。
- `src/utils/aggregateStatement.ts` — 取引データの集計ロジックとテスト `aggregateStatement.test.ts`。
- `src/hooks/useCsvParse.ts` — CSV のストリーム読み込み、converter 選択、進捗更新を行う処理。

---

必要であれば、以下の追加ドキュメントを作成します:

- 詳細なアーキテクチャ図（フロー図）
- 新機能の導入手順テンプレート
- コードスタイルとコミットメッセージ規約

ご希望を教えてください。

## ローカル開発手順（詳細）

1. 環境変数
   - プロジェクトルートに `.env.local` を作成し、`DATABASE_URL` を設定します。
   - 例:

```bash
# .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/bank_csv_grid"
```

2. 依存関係のインストール

```bash
pnpm install
```

3. Prisma クライアント生成（初回のみ）

```bash
pnpm prisma generate
```

4. マイグレーション適用とシード

```bash
pnpm prisma migrate deploy
pnpm prisma db seed
```

5. 開発サーバー起動

```bash
pnpm dev
```

6. ブラウザで開く

- `http://localhost:3000` にアクセスして UI を確認します。

## テスト実行

- 単体テストの実行:

```bash
pnpm test
```

- 主要テストファイル:
  - `src/utils/aggregateStatement.test.ts` など

## よくあるトラブルと解決法

- Prisma のクライアントが古い/生成されていない場合:
  - `pnpm prisma generate` を実行
- マイグレーションが適用できない場合:
  - `pnpm prisma migrate status` で状態確認、必要に応じて `pnpm prisma migrate reset` を実行（ローカルのみ、データ消去あり）

## 次にやれること（提案）

- CI 設定（GitHub Actions）を追加して、`pnpm test` と `pnpm lint` を PR で実行する。
- 型・API のドキュメント化（`src/types` を参照して OpenAPI/TypeDoc を生成する）

---

ドキュメントをここまで作成しました。他に詳しく知りたい箇所や、追加して欲しいドキュメントはありますか？
