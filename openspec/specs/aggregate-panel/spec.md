# aggregate-panel Specification

## Purpose
TBD - created by archiving change add-loan-management-opening-balance. Update Purpose after archive.
## Requirements
### Requirement: 期首残高の自動計算

The system MUST automatically calculate opening balances for each month and each bank, and display them in the aggregate panel. 各月・各銀行の期首残高を自動計算し、集計パネルに表示する。

#### Scenario: 当月に取引がある場合（入金）

**Given** GMO銀行の2024年4月の最初の取引が入金（credit=100万、balance=500万）
**When** 期首残高を計算する
**Then** 期首残高は400万円（balance - credit）となる

#### Scenario: 当月に取引がある場合（出金）

**Given** GMO銀行の2024年4月の最初の取引が出金（debit=50万、balance=450万）
**When** 期首残高を計算する
**Then** 期首残高は500万円（balance + debit）となる

#### Scenario: 当月に取引がない場合

**Given** GMO銀行の2024年5月に取引がない
**And** 2024年4月の最後の取引のbalanceが600万円
**When** 2024年5月の期首残高を計算する
**Then** 期首残高は600万円（前月繰越）となる

#### Scenario: 全く取引がない銀行

**Given** PayPay銀行の取引が一件も存在しない
**When** 期首残高を計算する
**Then** 期首残高は0円となる

---

### Requirement: report API拡張

The system MUST add `openingBalances` and `loans` fields to the report API response. report APIのレスポンスに`openingBalances`と`loans`フィールドを追加する。

#### Scenario: openingBalancesフィールドの追加

**Given** GMO、SBI銀行の取引が存在する
**When** `GET /api/report` を実行する
**Then** レスポンスに`openingBalances`オブジェクトが含まれる
**And** `openingBalances.gmo`が各月の期首残高の配列となる
**And** 配列の長さは`months`配列と同じである

#### Scenario: loansフィールドの追加

**Given** GMO銀行に「2024年春季融資」（1000万円、2024-04発生）が存在
**When** `GET /api/report?from=2024-01-01&to=2024-12-31` を実行する
**Then** レスポンスに`loans.gmo["2024年春季融資"]`が含まれる
**And** `amount`が1000万円である
**And** `startIndex`が3である（months配列内の2024-04のインデックス）

#### Scenario: 範囲外の融資

**Given** GMO銀行に「2023年融資」（発生年月2023-12）が存在
**When** `GET /api/report?from=2024-01-01&to=2024-12-31` を実行する
**Then** `loans.gmo["2023年融資"].startIndex`が-1である（範囲外）

---

### Requirement: 期首残高行の表示

The system MUST display opening balance rows at the top of the aggregate panel. 集計パネルの最上段に期首残高行を表示する。

#### Scenario: 期首残高行の配置

**Given** 集計パネルを表示する
**When** report APIから`openingBalances`を取得する
**Then** 集計パネルの最上段に期首残高行群が表示される
**And** タグ階層集計の上に配置される

#### Scenario: 期首残高行のスタイル

**Given** 期首残高行を表示する
**When** 行をレンダリングする
**Then** 背景色が薄黄色（`bg-yellow-50`）である
**And** テキストが太字（`font-semibold`）である

#### Scenario: 複数銀行の期首残高

**Given** GMO、SBI、PayPay銀行の期首残高が存在
**When** 集計パネルを表示する
**Then** 「GMO 期首残高」「SBI 期首残高」「PayPay 期首残高」の3行が表示される
**And** 各行に対応する月次データが表示される

---

### Requirement: 借入残高行の表示

The system MUST display loan balance rows and loan total row in the aggregate panel. 集計パネルに借入残高行群と借入合計行を表示する。

#### Scenario: 借入残高行の配置

**Given** 融資データが存在する
**When** 集計パネルを表示する
**Then** 月合計行の下に借入残高行群が表示される
**And** 借入合計行が借入残高行群の最後に表示される

#### Scenario: 借入残高行のスタイル

**Given** 借入残高行を表示する
**When** 行をレンダリングする
**Then** テキスト色が青色（`text-blue-700`）である
**And** テキストが太字（`font-semibold`）である

#### Scenario: 発生月以降の表示

**Given** GMO > 2024年春季融資（1000万円、2024-04発生）が存在
**And** months配列が["2024-01", "2024-02", "2024-03", "2024-04", "2024-05"]
**When** 借入残高行を表示する
**Then** 2024-01〜2024-03のセルは0
**And** 2024-04〜2024-05のセルは1000万円

#### Scenario: 借入合計行の計算

**Given** GMO > 融資A（500万円）とSBI > 融資B（300万円）が存在
**When** 借入合計行を表示する
**Then** 各月の合計が表示される（例: 同月なら800万円）

---

### Requirement: 累積営業ネットキャッシュ行の表示

The system MUST display the cumulative operating net cash flow row at the bottom of the aggregate panel. 集計パネルの最下段に累積営業ネットキャッシュ行を表示する。

#### Scenario: 累積ネット行の配置

**Given** 集計パネルを表示する
**When** 全行を構築する
**Then** 累積営業ネットキャッシュ行が最下段に配置される

#### Scenario: 累積ネット行のスタイル

**Given** 累積ネット行を表示する
**When** 行をレンダリングする
**Then** テキスト色が緑色（`text-green-700`）である
**And** テキストが太字（`font-bold`）である

#### Scenario: 累積ネットの計算

**Given** 月合計が[200万, 300万, 250万]
**And** 借入合計が[0, 500万, 1500万]
**When** 累積営業ネットキャッシュを計算する
**Then** 結果は[200万, -200万, -1250万]となる（月合計 - 借入合計）

---

### Requirement: グリッド行の構築順序

The system MUST construct aggregate panel rows in the correct order. 集計パネルの行を正しい順序で構築する。

#### Scenario: 行構成の順序

**Given** 全データが揃っている
**When** gridRowsを構築する
**Then** 行の順序は以下の通りである:
1. 期首残高行群
2. タグ階層集計
3. 月合計行
4. 借入残高行群
5. 借入合計行
6. 累積営業ネットキャッシュ行

---

### Requirement: パフォーマンス要件

The system MUST meet performance requirements for opening balance calculation and grid rendering. 期首残高計算とグリッド描画のパフォーマンスを保証する。

#### Scenario: 期首残高計算時間

**Given** 100件のTransactionデータが存在
**When** 期首残高を計算する
**Then** 計算時間が500ms以内である

#### Scenario: report APIレスポンス時間

**Given** 融資データと取引データが存在
**When** `GET /api/report` を実行する
**Then** レスポンスタイムが1秒以内である

#### Scenario: グリッド描画時間

**Given** 50行×12ヶ月のデータが存在
**When** 集計パネルをレンダリングする
**Then** 描画時間が1秒以内である

### Requirement: グリッドの表示領域

The system MUST provide sufficient height for the aggregate panel grid to display expanded data comfortably. 集計パネルのグリッドは、展開したデータを快適に表示できる十分な高さを持たなければならない。

#### Scenario: 全データ展開時の表示領域

**Given** 集計パネルにタグ階層、借入、期首残高などを含む全データが存在する
**When** 全展開ボタンを押してすべてのノードを展開する
**Then** グリッドの高さは2080px以上であり、ユーザーはスクロールして全データを閲覧できる
**And** データが上下に仕切られて見づらい状態ではない

#### Scenario: デフォルト表示状態

**Given** 集計パネルを初めて表示する
**When** ページをロードする
**Then** グリッドの高さは2080px以上であり、第1階層が展開された状態で表示される
**And** 必要に応じてスクロール可能である

