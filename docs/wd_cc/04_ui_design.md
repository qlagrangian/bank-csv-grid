# UI設計：融資管理機能と集計パネル拡張

## ドキュメント概要

本ドキュメントは、融資管理機能と集計パネル拡張のUI設計を記述します。コンポーネント構成、スタイルガイド、ユーザーフローを含みます。

## UI全体構成

### レイアウト構造

```
┌────────────────────────────────────────────────────────────┐
│  Header (共通)                                             │
└────────────────────────────────────────────────────────────┘
┌─────────────┬──────────────────────────────────────────────┐
│             │                                              │
│ Navigation  │  Content Area                                │
│ (256px)     │  (flex-1)                                    │
│             │                                              │
│ ■ 取引管理  │  ┌────────────────────────────────────────┐  │
│             │  │  FileImporter                          │  │
│ □ 融資管理  │  ├────────────────────────────────────────┤  │
│             │  │  TagMasterEditor                       │  │
│             │  ├────────────────────────────────────────┤  │
│             │  │  TransactionGrid                       │  │
│             │  ├────────────────────────────────────────┤  │
│             │  │  AggregatePanel（拡張）                │  │
│             │  └────────────────────────────────────────┘  │
│             │                                              │
│             │  または                                      │
│             │                                              │
│             │  ┌────────────────────────────────────────┐  │
│             │  │  LoanForm                              │  │
│             │  ├────────────────────────────────────────┤  │
│             │  │  LoanPanel                             │  │
│             │  └────────────────────────────────────────┘  │
│             │                                              │
└─────────────┴──────────────────────────────────────────────┘
```

---

## コンポーネント設計

### Navigation（サイドメニュー）

#### 目的
複数ページ間のナビゲーションを提供する。

#### 構造

```tsx
<nav className="w-64 bg-gray-100 border-r h-full p-4">
  <h2 className="text-lg font-bold mb-4">メニュー</h2>
  <ul className="space-y-2">
    <li>
      <Link href="/" className={isActive('/') ? 'active' : ''}>
        取引管理
      </Link>
    </li>
    <li>
      <Link href="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
        融資管理
      </Link>
    </li>
  </ul>
</nav>
```

#### スタイル

**通常状態**:
```css
.menu-link {
  display: block;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
}

.menu-link:hover {
  background-color: rgb(229, 231, 235); /* gray-200 */
}
```

**アクティブ状態**:
```css
.menu-link.active {
  background-color: rgb(37, 99, 235); /* blue-600 */
  color: white;
}
```

#### Props

```typescript
interface NavigationProps {
  // なし（usePathname()を内部で使用）
}
```

---

### LoanForm（融資登録フォーム）

#### 目的
新規融資を登録するフォームを提供する。

#### 構造

```tsx
<form onSubmit={handleSubmit} className="space-y-4">
  <div>
    <label className="block text-sm font-medium">銀行</label>
    <BankSelect value={bank} onChange={setBank} />
  </div>
  <div>
    <label className="block text-sm font-medium">融資バッチ名</label>
    <Input
      value={batchName}
      onChange={(e) => setBatchName(e.target.value)}
      placeholder="例: 2024年春季融資"
      required
    />
  </div>
  <div>
    <label className="block text-sm font-medium">融資額</label>
    <Input
      type="number"
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
      placeholder="10000000"
      required
    />
  </div>
  <div>
    <label className="block text-sm font-medium">発生年月</label>
    <Input
      type="month"
      value={occurrenceYM}
      onChange={(e) => setOccurrenceYM(e.target.value)}
      required
    />
  </div>
  <Button type="submit" disabled={loading}>
    {loading ? "登録中…" : "融資登録"}
  </Button>
</form>
```

#### Props

```typescript
interface LoanFormProps {
  onSuccess: () => void;  // 登録成功時のコールバック
}
```

#### バリデーション

- **全フィールド必須**: HTML5の`required`属性
- **融資額**: `type="number"`で数値のみ入力可能、正数チェックはAPI側
- **発生年月**: `type="month"`でYYYY-MM形式を自動保証

#### エラーハンドリング

```typescript
try {
  const res = await fetch("/api/loans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bank, batchName, amount: parseFloat(amount), occurrenceYM }),
  });

  if (!res.ok) {
    const err = await res.json();
    alert(`Error: ${err.error}`);
    return;
  }

  // 成功処理
  setBatchName("");
  setAmount("");
  setOccurrenceYM("");
  onSuccess();
} catch (error) {
  alert("エラーが発生しました");
}
```

#### スタイルガイド

- **ラベル**: `text-sm font-medium`、灰色テキスト
- **入力フィールド**: shadcn/uiの`Input`コンポーネント使用
- **ボタン**: shadcn/uiの`Button`コンポーネント使用
- **スペーシング**: `space-y-4`で垂直方向に4単位の間隔

---

### LoanPanel（融資額パネル）

#### 目的
融資データを一覧表示し、削除操作を提供する。

#### 構造

```tsx
<div className="space-y-4">
  <h2 className="text-xl font-bold">融資額パネル</h2>
  <div className="h-[400px] border rounded overflow-hidden">
    <DataGrid columns={columns} rows={rows} />
  </div>
</div>
```

#### グリッド列構成

| 列名 | 幅 | 説明 |
|-----|---|------|
| 銀行 | 120px | 銀行コード |
| 融資バッチ | 200px | 融資バッチ名 |
| 2024-01 | 110px | 各月の融資額 |
| ... | 110px | ... |
| 操作 | 80px | 削除ボタン |

#### 月次セルの表示ルール

```typescript
renderCell: ({ row }: { row: LoanGridRow }) => {
  const amt = row.monthlyAmounts[i];
  return amt !== null ? amt.toLocaleString("ja-JP") : "-";
}
```

- **発生月以前**: `-`（ハイフン）
- **発生月以降**: 融資額をカンマ区切りで表示（例: `10,000,000`）

#### 削除ボタン

```tsx
<button
  onClick={() => {
    if (confirm("この融資を削除しますか？")) {
      onDelete(row.id);
    }
  }}
  className="text-red-600 text-sm"
>
  削除
</button>
```

#### Props

```typescript
interface LoanPanelProps {
  // なし（useLoans()フックを内部で使用）
}
```

---

### AggregatePanel（拡張）

#### 目的
タグ階層集計に加え、期首残高・借入残高・累積ネットキャッシュを表示する。

#### 行構成（上から順）

```
┌──────────────────┬─────────┬─────────┬─────────┐
│ タグ             │ 2024-01 │ 2024-02 │ 2024-03 │
├──────────────────┼─────────┼─────────┼─────────┤
│ 🟡 GMO 期首残高  │ 5,000k  │ 5,200k  │ 5,150k  │ ← 薄黄色
│ 🟡 SBI 期首残高  │ 3,000k  │ 3,100k  │ 3,050k  │
├──────────────────┼─────────┼─────────┼─────────┤
│ [+] 収入         │  1,000k │  1,200k │  1,100k │ ← 既存ツリー
│   [-] 売上       │    800k │  1,000k │    900k │
│ [+] 支出         │   -800k │   -900k │   -850k │
├──────────────────┼─────────┼─────────┼─────────┤
│ 月合計           │    200k │    300k │    250k │ ← 既存
├──────────────────┼─────────┼─────────┼─────────┤
│ 🔵 GMO > 春季    │      0  │      0  │ 10,000k │ ← 借入行群
│ 🔵 SBI > 運転A   │      0  │  5,000k │  5,000k │
│ 🔵 借入合計      │      0  │  5,000k │ 15,000k │
├──────────────────┼─────────┼─────────┼─────────┤
│ 🟢 累積ネット    │    200k │ -4,700k │-14,750k │ ← 最終行
└──────────────────┴─────────┴─────────┴─────────┘
```

#### 新規行のスタイル

**期首残高行** (`isOpeningBalanceRow: true`):
```tsx
<span className="font-semibold bg-yellow-50 px-2 py-1 rounded">
  {row.name}
</span>
```

- 背景: `bg-yellow-50`（薄黄色）
- テキスト: `font-semibold`（太字）

**借入残高行** (`isLoanRow: true`):
```tsx
<span className="font-semibold text-blue-700">
  {row.name}
</span>
```

- テキスト: `text-blue-700`（青色）、`font-semibold`（太字）

**累積ネットキャッシュ行** (`isCumulativeCashRow: true`):
```tsx
<span className="font-bold text-green-700">
  {row.name}
</span>
```

- テキスト: `text-green-700`（緑色）、`font-bold`（太字）

#### gridRows構築ロジック

```typescript
const gridRows = useMemo<ReportRow[]>(() => {
  if (!data) return [];

  // 期首残高行
  const openingRows = buildOpeningBalanceRows(
    data.openingBalances ?? {},
    data.months
  );

  // 既存のタグ階層
  const tagRows = flattenVisibleMonthly(
    data.tree,
    expanded,
    toggle,
    data.months,
    0
  );

  // 月合計行
  const monthlyTotals = data.months.map((_, i) =>
    tagRows.reduce((sum, row) => sum + row.monthlyNet[i], 0)
  );
  const totalRow = {
    id: "__monthly_total__",
    name: "月合計",
    depth: 0,
    childrenCount: 0,
    expanded: false,
    monthlyNet: monthlyTotals,
    netTotal: monthlyTotals.reduce((a, b) => a + b, 0),
    isTotalRow: true,
  };

  // 借入残高行群
  const loanRows = buildLoanRows(data.loans ?? {}, data.months);
  const loanTotalRow = buildLoanTotalRow(loanRows);

  // 累積営業ネットキャッシュ行
  const cumulativeCashRow = buildCumulativeCashRow(
    monthlyTotals,
    loanTotalRow.monthlyNet
  );

  return [
    ...openingRows,      // 最上段
    ...tagRows,          // タグ階層
    totalRow,            // 月合計
    ...loanRows,         // 借入行群
    loanTotalRow,        // 借入合計
    cumulativeCashRow,   // 累積ネット（最終行）
  ];
}, [data, expanded, toggle]);
```

#### Props

```typescript
interface AggregatePanelProps {
  // なし（内部でfetchReport()を使用）
}
```

---

## ユーザーフロー

### フロー1: 融資の新規登録

```
┌─────────────┐
│ ユーザー    │
└──────┬──────┘
       │ 1. サイドメニューで「融資管理」をクリック
       ▼
┌─────────────────────────────────┐
│ ダッシュボードページ             │
│  ┌────────────────────────────┐ │
│  │ 融資登録フォーム            │ │
│  └────────────────────────────┘ │
└──────┬──────────────────────────┘
       │ 2. 銀行、バッチ名、金額、年月を入力
       │ 3. 「融資登録」ボタンをクリック
       ▼
┌─────────────────────────────────┐
│ POST /api/loans                 │
│  - タグ自動生成                 │
│  - Loan作成                     │
└──────┬──────────────────────────┘
       │ 4. 成功レスポンス
       ▼
┌─────────────────────────────────┐
│ LoanPanel                       │
│  - 融資一覧を更新               │
│  - 新規融資が表示される         │
└─────────────────────────────────┘
```

### フロー2: 集計パネルでの借入残高確認

```
┌─────────────┐
│ ユーザー    │
└──────┬──────┘
       │ 1. サイドメニューで「取引管理」をクリック
       ▼
┌─────────────────────────────────┐
│ 取引管理ページ                  │
│  ┌────────────────────────────┐ │
│  │ AggregatePanel             │ │
│  │  - 期首残高行（最上段）    │ │
│  │  - タグ階層集計            │ │
│  │  - 月合計行                │ │
│  │  - 借入残高行（最下段）    │ │
│  │  - 累積ネット行            │ │
│  └────────────────────────────┘ │
└──────┬──────────────────────────┘
       │ 2. フィルタ（from/to/bank）を変更
       ▼
┌─────────────────────────────────┐
│ GET /api/report                 │
│  - 期首残高計算                 │
│  - Loan取得                     │
└──────┬──────────────────────────┘
       │ 3. 拡張レスポンス
       ▼
┌─────────────────────────────────┐
│ AggregatePanel                  │
│  - 期首残高行を更新             │
│  - 借入残高行を更新             │
│  - 累積ネット行を更新           │
└─────────────────────────────────┘
```

### フロー3: 融資の削除

```
┌─────────────┐
│ ユーザー    │
└──────┬──────┘
       │ 1. LoanPanelで削除ボタンをクリック
       ▼
┌─────────────────────────────────┐
│ 確認ダイアログ                  │
│  「この融資を削除しますか？」   │
└──────┬──────────────────────────┘
       │ 2. 「OK」をクリック
       ▼
┌─────────────────────────────────┐
│ DELETE /api/loans/[id]          │
│  - TagAssignment確認            │
│  - 条件付きタグ削除             │
│  - Loan削除                     │
└──────┬──────────────────────────┘
       │ 3. 成功レスポンス
       ▼
┌─────────────────────────────────┐
│ LoanPanel                       │
│  - 融資一覧を更新               │
│  - 削除された融資が非表示       │
└─────────────────────────────────┘
```

---

## レスポンシブ対応

### 対応方針

**デスクトップ専用**: レスポンシブ対応は行わない（将来対応）

**最小推奨解像度**: 1280×720px

---

## アクセシビリティ

### キーボード操作

- **Tab**: フォーカス移動
- **Enter**: ボタン実行、リンク遷移
- **Escape**: モーダル閉じる（該当なし）

### ARIA属性

- `aria-label`: 削除ボタンに「融資を削除」
- `role="navigation"`: Navigationコンポーネント

---

## カラーパレット

| 用途 | カラー | Tailwind Class |
|-----|--------|---------------|
| 期首残高行（背景） | 薄黄色 | `bg-yellow-50` |
| 借入残高行（テキスト） | 青色 | `text-blue-700` |
| 累積ネット行（テキスト） | 緑色 | `text-green-700` |
| サイドメニュー（背景） | 灰色 | `bg-gray-100` |
| サイドメニュー（アクティブ） | 青色 | `bg-blue-600` |
| エラーテキスト | 赤色 | `text-red-600` |

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|-----------|---------|
| 2025-12-02 | 1.0 | 初版作成 |
