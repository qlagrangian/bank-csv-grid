# Quickstart

## 概要

本機能の最小導線を手早く検証するための手順。

## 前提

- PostgreSQL と Prisma の環境変数 `DATABASE_URL` が設定済み
- `pnpm install` 済み

## ステップ

1. サーバ起動

```bash
pnpm dev
```

2. タグ作成（親 → 子 → 孫）

```bash
curl -sS -X POST localhost:3000/api/tags \
 -H 'Content-Type: application/json' \
 -d '{"name":"PJ収入の部","parentId":null}'
```

3. 取引へのタグ付与

```bash
curl -sS -X PUT localhost:3000/api/transactions/<txId>/tags \
 -H 'Content-Type: application/json' \
 -d '{"tagIds":["<leafTagId>"]}'
```

4. レポート生成

```bash
curl -sS "localhost:3000/api/report?from=2025-01-01&to=2025-12-31"
```

5. CSV エクスポート

```bash
curl -sS "localhost:3000/api/export?from=2025-01-01&to=2025-12-31" -o report.csv
```
