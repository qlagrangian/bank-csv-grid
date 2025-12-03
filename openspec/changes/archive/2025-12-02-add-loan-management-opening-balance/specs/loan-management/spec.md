# Spec: Loan Management

## ADDED Requirements

### Requirement: Loan データモデル

The system MUST provide a Loan model to manage loan information, including bank code, batch name, amount, occurrence year-month, and tag ID. 融資情報を管理するためのLoanモデルを追加する。銀行コード、融資バッチ名、融資額、発生年月、タグIDを含む。

#### Scenario: Loanレコードの作成

**Given** ユーザーが新規融資を登録する
**When** 銀行、融資バッチ名、金額、発生年月を入力して登録する
**Then** Loanレコードが作成され、一意のIDが割り当てられる
**And** `bank`, `batchName`, `amount`, `occurrenceYM`, `tagId`が保存される
**And** `createdAt`, `updatedAt`が自動設定される

#### Scenario: 同銀行内での融資バッチ名の重複防止

**Given** GMO銀行に「2024年春季融資」という融資が既に存在する
**When** 同じ銀行で同じバッチ名の融資を登録しようとする
**Then** Unique制約エラー（P2002）が発生する
**And** APIは409 Conflictを返す

#### Scenario: 異なる銀行での同名融資バッチ

**Given** GMO銀行に「運転資金A」という融資が存在する
**When** SBI銀行に「運転資金A」という融資を登録する
**Then** 登録が成功する（銀行が異なるため）

---

### Requirement: 融資一覧の取得

The system MUST allow retrieving all loans or filtering loans by specific bank. 全融資または特定銀行の融資一覧を取得する。

#### Scenario: 全融資の取得

**Given** データベースに複数の融資が登録されている
**When** `GET /api/loans` を実行する
**Then** 全融資のリストが返される
**And** 融資は銀行コード昇順、発生年月昇順でソートされている

#### Scenario: 銀行コードで絞り込み

**Given** GMO、SBI、PayPayの融資が登録されている
**When** `GET /api/loans?bank=gmo` を実行する
**Then** GMO銀行の融資のみが返される

---

### Requirement: 融資登録時のタグ自動生成

The system MUST automatically generate bank tags and loan batch tags when registering a loan. 融資登録時に、銀行タグと融資バッチタグを自動生成する。

#### Scenario: 新規銀行の融資登録

**Given** GMO銀行のタグが存在しない
**When** GMO銀行の融資を登録する
**Then** 「GMO」という名前の銀行タグ（`parentId = null`）が作成される
**And** 融資バッチ名のタグが銀行タグの子として作成される
**And** Loanレコードの`tagId`に融資バッチタグのIDが保存される

#### Scenario: 既存銀行への追加融資

**Given** GMO銀行のタグが既に存在する
**When** GMO銀行の別の融資を登録する
**Then** 既存の「GMO」銀行タグを使用する
**And** 新しい融資バッチタグが銀行タグの子として作成される

#### Scenario: 融資バッチタグが既に存在する場合

**Given** GMO > 2024年春季融資 というタグが既に存在する
**When** GMO銀行に「2024年春季融資」という融資を登録する
**Then** 既存の融資バッチタグを使用する
**And** タグの重複作成は発生しない（P2002エラーを捕捉して既存タグを取得）

---

### Requirement: 融資の更新

The system MUST allow updating loan amount and occurrence year-month, but MUST NOT allow changing bank code or batch name. 融資の金額と発生年月を更新できる。銀行コードと融資バッチ名の変更は不可。

#### Scenario: 融資額の変更

**Given** 融資ID「abc123」が存在し、金額が1000万円
**When** `PATCH /api/loans/abc123` で `{ amount: 1200万 }` を送信する
**Then** 融資額が1200万円に更新される
**And** `updatedAt`が更新される

#### Scenario: 発生年月の変更

**Given** 融資ID「abc123」の発生年月が「2024-04」
**When** `PATCH /api/loans/abc123` で `{ occurrenceYM: "2024-05" }` を送信する
**Then** 発生年月が「2024-05」に更新される

#### Scenario: 存在しない融資の更新

**Given** 融資ID「nonexistent」が存在しない
**When** `PATCH /api/loans/nonexistent` を実行する
**Then** 404 Not Foundエラーが返される

---

### Requirement: 融資の削除

The system MUST delete loans and conditionally delete associated tags based on usage. 融資を削除し、条件に応じてタグも削除する。

#### Scenario: 未使用タグの削除

**Given** 融資ID「abc123」が存在し、そのタグに`TagAssignment`が紐付いていない
**When** `DELETE /api/loans/abc123` を実行する
**Then** 融資レコードが削除される
**And** 融資バッチタグも削除される（未使用のため）

#### Scenario: 使用中タグの保持

**Given** 融資ID「abc123」のタグに返済取引が紐付いている（`TagAssignment`が存在）
**When** `DELETE /api/loans/abc123` を実行する
**Then** 融資レコードは削除される
**And** 融資バッチタグは保持される（返済取引への紐付けを維持）

#### Scenario: 存在しない融資の削除

**Given** 融資ID「nonexistent」が存在しない
**When** `DELETE /api/loans/nonexistent` を実行する
**Then** 404 Not Foundエラーが返される

---

### Requirement: バリデーション

The system MUST validate loan data during registration and updates. 融資登録・更新時のバリデーションを実施する。

#### Scenario: 必須フィールドの検証

**Given** ユーザーが融資登録フォームを開く
**When** 銀行、バッチ名、金額、発生年月のいずれかが空欄で登録する
**Then** 400 Bad Requestエラーが返される
**And** エラーメッセージが「Missing fields」である

#### Scenario: 融資額の正数検証

**Given** ユーザーが融資登録フォームで金額に0または負数を入力
**When** 登録ボタンを押す
**Then** 400 Bad Requestエラーが返される
**And** エラーメッセージが「Amount must be positive」である

#### Scenario: 発生年月のフォーマット検証

**Given** ユーザーが発生年月に「2024/04」（YYYY/MM形式）を入力
**When** 登録ボタンを押す
**Then** 400 Bad Requestエラーが返される
**And** エラーメッセージが「Invalid occurrenceYM format」である
**And** 正しいフォーマットは「YYYY-MM」である

---

### Requirement: トランザクション安全性

The system MUST execute tag generation and Loan creation atomically. タグ生成とLoan作成はアトミックに実行される。

#### Scenario: タグ生成とLoan作成の一括コミット

**Given** 新規融資を登録する
**When** タグ生成中にエラーが発生する
**Then** Loanレコードも作成されない（ロールバック）

#### Scenario: タグ生成成功時のコミット

**Given** 新規融資を登録する
**When** タグ生成とLoan作成がすべて成功する
**Then** トランザクションがコミットされる
**And** データベースに一貫した状態で保存される
