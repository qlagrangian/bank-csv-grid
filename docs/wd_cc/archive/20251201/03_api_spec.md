# API仕様：融資管理機能と集計パネル拡張

## ドキュメント概要

本ドキュメントは、融資管理機能と集計パネル拡張に関連するAPIエンドポイントの仕様を記述します。

## エンドポイント一覧

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/api/loans` | 融資一覧取得 |
| POST | `/api/loans` | 新規融資登録 |
| PATCH | `/api/loans/[id]` | 融資更新 |
| DELETE | `/api/loans/[id]` | 融資削除 |
| GET | `/api/report` | レポート取得（拡張） |

---

## `/api/loans` - 融資一覧取得

### GET /api/loans

融資データの一覧を取得します。

#### リクエスト

**URL**:
```
GET /api/loans?bank=gmo
```

**クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| bank | string | No | 銀行コード（paypay\|gmo\|sbi\|mizuhoebiz\|mizuhobizweb）で絞り込み |

**ヘッダー**:
- なし

#### レスポンス

**成功時（200 OK）**:

```json
[
  {
    "id": "cm1abc123",
    "bank": "gmo",
    "batchName": "2024年春季融資",
    "amount": 10000000,
    "occurrenceYM": "2024-04",
    "tagId": "tag_xyz789",
    "memo": null,
    "createdAt": "2024-04-01T00:00:00.000Z",
    "updatedAt": "2024-04-01T00:00:00.000Z"
  },
  {
    "id": "cm1def456",
    "bank": "sbi",
    "batchName": "運転資金A",
    "amount": 5000000,
    "occurrenceYM": "2024-02",
    "tagId": "tag_abc123",
    "memo": "備考テスト",
    "createdAt": "2024-02-01T00:00:00.000Z",
    "updatedAt": "2024-02-01T00:00:00.000Z"
  }
]
```

**エラー時（500 Internal Server Error）**:

```json
{
  "error": "Error message"
}
```

#### 実装例

```typescript
// src/app/api/loans/route.ts
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bank = searchParams.get('bank');

  try {
    const where = bank ? { bank } : {};
    const loans = await prisma.loan.findMany({
      where,
      orderBy: [{ bank: 'asc' }, { occurrenceYM: 'asc' }],
    });

    return NextResponse.json(loans);
  } catch (error) {
    console.error('[API /loans GET]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

---

## `/api/loans` - 新規融資登録

### POST /api/loans

新規融資を登録し、自動でタグを生成します。

#### リクエスト

**URL**:
```
POST /api/loans
```

**ヘッダー**:
```
Content-Type: application/json
```

**ボディ**:

```json
{
  "bank": "gmo",
  "batchName": "2024年春季融資",
  "amount": 10000000,
  "occurrenceYM": "2024-04"
}
```

**パラメータ詳細**:

| フィールド | 型 | 必須 | 説明 | 制約 |
|-----------|---|------|------|------|
| bank | string | Yes | 銀行コード | paypay\|gmo\|sbi\|mizuhoebiz\|mizuhobizweb |
| batchName | string | Yes | 融資バッチ名 | 任意の文字列、同銀行内で一意 |
| amount | number | Yes | 融資額 | 正の数値 |
| occurrenceYM | string | Yes | 発生年月 | YYYY-MM形式 |

#### レスポンス

**成功時（201 Created）**:

```json
{
  "id": "cm1abc123",
  "bank": "gmo",
  "batchName": "2024年春季融資",
  "amount": 10000000,
  "occurrenceYM": "2024-04",
  "tagId": "tag_xyz789",
  "memo": null,
  "createdAt": "2024-04-01T00:00:00.000Z",
  "updatedAt": "2024-04-01T00:00:00.000Z"
}
```

**エラー時（400 Bad Request）**:

```json
{
  "error": "Missing fields"
}
```

または

```json
{
  "error": "Invalid occurrenceYM format"
}
```

**エラー時（409 Conflict）**:

```json
{
  "error": "Loan already exists"
}
```

同一銀行・同一バッチ名の融資が既に存在する場合。

**エラー時（500 Internal Server Error）**:

```json
{
  "error": "Error message"
}
```

#### タグ自動生成ロジック

1. **銀行タグの検索/作成**:
   - `Tag`テーブルで`name = bank`かつ`parentId = null`を検索
   - 存在しない場合は新規作成

2. **融資バッチタグの作成**:
   - 銀行タグの子として`name = batchName`のタグを作成
   - `parentId`に銀行タグのIDを設定
   - 重複の場合（`P2002`エラー）は既存タグを取得

3. **Loanレコードの作成**:
   - `tagId`に生成したタグIDを保存

#### 実装例

```typescript
// src/app/api/loans/route.ts
export async function POST(req: NextRequest) {
  const { bank, batchName, amount, occurrenceYM } = await req.json();

  // バリデーション
  if (!bank || !batchName || !amount || !occurrenceYM) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}$/.test(occurrenceYM)) {
    return NextResponse.json({ error: 'Invalid occurrenceYM format' }, { status: 400 });
  }

  try {
    // トランザクション: タグ生成 + Loan作成
    const loan = await prisma.$transaction(async (tx) => {
      // 1. 銀行タグ取得/作成
      let bankTag = await tx.tag.findFirst({
        where: { name: bank, parentId: null },
      });
      if (!bankTag) {
        bankTag = await tx.tag.create({
          data: { name: bank, parentId: null, order: 0 },
        });
      }

      // 2. 融資バッチタグ作成
      let batchTag;
      try {
        batchTag = await tx.tag.create({
          data: { name: batchName, parentId: bankTag.id, order: 0 },
        });
      } catch (e: any) {
        if (e.code === 'P2002') {
          // 重複: 既存タグを取得
          batchTag = await tx.tag.findFirst({
            where: { name: batchName, parentId: bankTag.id },
          });
        } else {
          throw e;
        }
      }

      // 3. Loan作成
      return tx.loan.create({
        data: { bank, batchName, amount, occurrenceYM, tagId: batchTag!.id },
      });
    });

    return NextResponse.json(loan, { status: 201 });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Loan already exists' }, { status: 409 });
    }
    console.error('[API /loans POST]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
```

---

## `/api/loans/[id]` - 融資更新

### PATCH /api/loans/[id]

融資の金額または発生年月を更新します。

#### リクエスト

**URL**:
```
PATCH /api/loans/cm1abc123
```

**ヘッダー**:
```
Content-Type: application/json
```

**ボディ**:

```json
{
  "amount": 12000000,
  "occurrenceYM": "2024-05"
}
```

**パラメータ詳細**:

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| amount | number | No | 融資額（更新する場合のみ） |
| occurrenceYM | string | No | 発生年月（更新する場合のみ、YYYY-MM形式） |

**注意**: 銀行コードとバッチ名の変更は不可。変更が必要な場合は削除→再登録で対応。

#### レスポンス

**成功時（200 OK）**:

```json
{
  "id": "cm1abc123",
  "bank": "gmo",
  "batchName": "2024年春季融資",
  "amount": 12000000,
  "occurrenceYM": "2024-05",
  "tagId": "tag_xyz789",
  "memo": null,
  "createdAt": "2024-04-01T00:00:00.000Z",
  "updatedAt": "2024-12-02T10:30:00.000Z"
}
```

**エラー時（400 Bad Request）**:

```json
{
  "error": "Invalid occurrenceYM"
}
```

**エラー時（404 Not Found）**:

```json
{
  "error": "Loan not found"
}
```

**エラー時（500 Internal Server Error）**:

```json
{
  "error": "Error message"
}
```

#### 実装例

```typescript
// src/app/api/loans/[id]/route.ts
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { amount, occurrenceYM } = await req.json();

  const data: any = {};
  if (amount !== undefined) data.amount = amount;
  if (occurrenceYM !== undefined) {
    if (!/^\d{4}-\d{2}$/.test(occurrenceYM)) {
      return NextResponse.json({ error: 'Invalid occurrenceYM' }, { status: 400 });
    }
    data.occurrenceYM = occurrenceYM;
  }

  try {
    const loan = await prisma.loan.update({ where: { id }, data });
    return NextResponse.json(loan);
  } catch (e: any) {
    if (e.code === 'P2025') {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }
    console.error('[API /loans PATCH]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
```

---

## `/api/loans/[id]` - 融資削除

### DELETE /api/loans/[id]

融資を削除し、条件に応じてタグも削除します。

#### リクエスト

**URL**:
```
DELETE /api/loans/cm1abc123
```

**ヘッダー**:
- なし

**ボディ**:
- なし

#### レスポンス

**成功時（200 OK）**:

```json
{
  "ok": true
}
```

**エラー時（404 Not Found）**:

```json
{
  "error": "Loan not found"
}
```

**エラー時（500 Internal Server Error）**:

```json
{
  "error": "Error message"
}
```

#### タグ削除ロジック

1. **Loan取得**: 削除対象のLoanレコードを取得（`tagId`含む）
2. **TagAssignment確認**: そのタグに紐付く`TagAssignment`の数をカウント
3. **条件付き削除**:
   - `count = 0`の場合: タグも削除（未使用タグ）
   - `count > 0`の場合: タグを保持（返済取引への紐付けを維持）
4. **Loan削除**: Loanレコードを削除

#### 実装例

```typescript
// src/app/api/loans/[id]/route.ts
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({ where: { id } });
      if (!loan) throw new Error('Loan not found');

      // TagAssignment確認
      if (loan.tagId) {
        const assignCount = await tx.tagAssignment.count({
          where: { tagId: loan.tagId },
        });
        if (assignCount === 0) {
          // 未使用タグなら削除
          await tx.tag.delete({ where: { id: loan.tagId } });
        }
      }

      await tx.loan.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === 'Loan not found') {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }
    console.error('[API /loans DELETE]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
```

---

## `/api/report` - レポート取得（拡張）

### GET /api/report

タグ階層集計レポートを取得します。**期首残高**と**融資データ**を含むように拡張されています。

#### リクエスト

**URL**:
```
GET /api/report?from=2024-01-01&to=2024-12-31&bank=gmo&mode=monthly
```

**クエリパラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| from | string | No | 集計開始日（YYYY-MM-DD形式） |
| to | string | No | 集計終了日（YYYY-MM-DD形式） |
| bank | string | No | 銀行コード絞り込み |
| mode | string | No | 集計モード（現在は"monthly"のみ、省略可） |

#### レスポンス

**成功時（200 OK）**:

```json
{
  "from": "2024-01-01T00:00:00.000Z",
  "to": "2024-12-31T23:59:59.999Z",
  "bank": null,
  "mode": "monthly",
  "months": ["2024-01", "2024-02", "2024-03"],
  "tree": [
    {
      "id": "tag_income",
      "name": "収入",
      "order": 0,
      "active": true,
      "debit": 0,
      "credit": 3000000,
      "monthly": [
        { "debit": 0, "credit": 1000000 },
        { "debit": 0, "credit": 1200000 },
        { "debit": 0, "credit": 800000 }
      ],
      "children": []
    }
  ],
  "openingBalances": {
    "gmo": [5000000, 5200000, 5150000],
    "sbi": [3000000, 3100000, 3050000]
  },
  "loans": {
    "gmo": {
      "2024年春季融資": {
        "amount": 10000000,
        "startIndex": 3
      }
    },
    "sbi": {
      "運転資金A": {
        "amount": 5000000,
        "startIndex": 1
      }
    }
  }
}
```

**レスポンス詳細**:

| フィールド | 型 | 説明 |
|-----------|---|------|
| from | string\|null | 集計開始日時（ISO形式） |
| to | string\|null | 集計終了日時（ISO形式） |
| bank | string\|null | 絞り込み銀行コード |
| mode | string | 集計モード（"monthly"） |
| months | string[] | 月次配列（["YYYY-MM", ...]） |
| tree | ReportNodeMonthly[] | タグ階層集計ツリー（既存） |
| openingBalances | object | **新規**: 銀行別期首残高 |
| loans | object | **新規**: 銀行別融資データ |

**openingBalances構造**:
```typescript
{
  [bank: string]: number[];  // months と同じ長さの配列
}
```

**loans構造**:
```typescript
{
  [bank: string]: {
    [batchName: string]: {
      amount: number;         // 融資額
      startIndex: number;     // months配列内の発生月インデックス
    };
  };
}
```

**エラー時（500 Internal Server Error）**:

```json
{
  "error": "Error message"
}
```

#### 拡張実装箇所

**期首残高計算ロジック**:
```typescript
// src/app/api/report/route.ts

// 各銀行・各月ごとの期首残高を計算
const openingBalances: { [bank: string]: number[] } = {};
const banks = [...new Set(assigns.map(a => a.transaction.bank))];

for (const bank of banks) {
  const balances = new Array(months.length).fill(0);

  for (let i = 0; i < months.length; i++) {
    const [y, m] = months[i].split('-').map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);

    // 当月の最初のトランザクション
    const firstTx = await prisma.transaction.findFirst({
      where: {
        bank,
        date: { gte: monthStart, lte: monthEnd },
      },
      orderBy: { date: 'asc' },
    });

    if (firstTx) {
      // LOGIC-01: 当月に取引あり
      if (firstTx.credit > 0) {
        balances[i] = (firstTx.balance ?? 0) - firstTx.credit;
      } else {
        balances[i] = (firstTx.balance ?? 0) + firstTx.debit;
      }
    } else {
      // LOGIC-03: 当月に取引なし → 前月以前の最後の取引
      const lastTx = await prisma.transaction.findFirst({
        where: {
          bank,
          date: { lt: monthStart },
        },
        orderBy: { date: 'desc' },
      });

      balances[i] = lastTx?.balance ?? 0;
    }
  }

  openingBalances[bank] = balances;
}
```

**Loan取得・整形ロジック**:
```typescript
// Loan取得
const loansFromDB = await prisma.loan.findMany();
const loansByBank: {
  [bank: string]: {
    [batchName: string]: { amount: number; startIndex: number };
  };
} = {};

for (const loan of loansFromDB) {
  if (!loansByBank[loan.bank]) loansByBank[loan.bank] = {};

  const startIndex = months.indexOf(loan.occurrenceYM);
  loansByBank[loan.bank][loan.batchName] = {
    amount: loan.amount,
    startIndex: startIndex >= 0 ? startIndex : -1, // 範囲外は-1
  };
}
```

**レスポンス拡張**:
```typescript
return NextResponse.json({
  from: fromYMD ? startOfDayLocal(fromYMD).toISOString() : null,
  to: toYMD ? endOfDayLocal(toYMD).toISOString() : null,
  bank: bank ?? null,
  mode,
  months,
  tree,
  openingBalances, // 追加
  loans: loansByBank, // 追加
});
```

---

## エラーコード一覧

| HTTPステータス | エラーコード | 説明 |
|--------------|-------------|------|
| 400 | Bad Request | リクエストパラメータが不正 |
| 404 | Not Found | リソースが存在しない |
| 409 | Conflict | リソースの重複（Unique制約違反） |
| 500 | Internal Server Error | サーバー内部エラー |

### Prisma エラーコード

| コード | 説明 | HTTPステータス |
|-------|------|--------------|
| P2002 | Unique constraint violation | 409 Conflict |
| P2003 | Foreign key constraint violation | 400 Bad Request |
| P2025 | Record not found | 404 Not Found |

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-12-02 | 1.0 | 初版作成 |
