# Data Model

## Entities

### Tag

- id: string (UUID)
- name: string
- parentId: string | null
- path: string (computed, e.g., `PJ収入の部>プロジェクト売り上げ>SES`)
- order: number
- active: boolean
- createdAt: Date
- updatedAt: Date
- Unique: (parentId, name)

### Transaction

- id: string (cuid)
- bank: string
- date: Date
- description: string
- credit: number
- debit: number
- balance: number | null
- memo: string | null
- legacyTag: string | null // 既存単一タグの後方互換保持
- createdAt: Date

### TagAssignment

- id: string (cuid)
- transactionId: string (FK → Transaction)
- tagId: string (FK → Tag)
- createdBy: string | null
- createdAt: Date
- Unique: (transactionId, tagId)

## Rules

- 保存は葉タグのみ。集計時に祖先へロールアップ。
- 同一取引 × 同一タグの重複は禁止。
- タグ名の一意は同一親内。

## Derived

- レポートノード: Tag ツリーの各ノードに対し小計/合計（credit/debit の定義はドメイン規則に依存）。
