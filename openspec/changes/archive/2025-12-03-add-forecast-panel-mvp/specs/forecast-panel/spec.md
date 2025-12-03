# forecast-panel Specification

## Purpose
資金繰り予測専用の編集可能なテーブルを提供する。ユーザーはKPI（売上、ユーザー数など）や定数（成長率、係数）を月次で入力し、式による自動計算や過去期間ロックにより、将来の資金繰りを効率的に予測できる。

## ADDED Requirements

### Requirement: KPI行の手入力と横フィル

The system MUST allow users to input numeric values in KPI rows and fill them horizontally using fill handle. KPI行に数値を入力し、フィルハンドルで横方向にコピーできる。

#### Scenario: KPI行に数値を入力する

**Given** ForecastPanel が表示されている
**And** KPI行「売上」が存在する
**When** ユーザーが "m_2025-01" セルに "1000000" を入力する
**Then** セルの値が 1000000 になる
**And** セルが編集可能状態である

#### Scenario: フィルハンドルで横引きする

**Given** KPI行「売上」の "m_2025-01" セルに 1000000 が入力されている
**When** ユーザーがフィルハンドルを "m_2025-03" までドラッグする
**Then** "m_2025-02" と "m_2025-03" のセルが 1000000 になる

#### Scenario: 過去期間のセルは編集不可

**Given** 基準日が "2025-01-01" である
**When** ユーザーが "m_2024-12" セル（過去期間）を編集しようとする
**Then** セルは編集不可である
**And** セルがグレーアウト表示される

---

### Requirement: 簡易式入力による自動計算

The system MUST support simple formulas (e.g., `=A1*1.1`) in calculation rows and automatically recalculate when referenced cells change. 計算行で簡易式（`=A1*1.1`）をサポートし、参照セル変更時に自動再計算する。

#### Scenario: 計算行に式を入力する

**Given** ForecastPanel が表示されている
**And** KPI行「売上」が行インデックス 0 にある
**And** 計算行「広告費」が行インデックス 1 にある
**When** 「広告費」の "m_2025-01" セルに式 "=A0*0.3" を設定する
**And** 「売上」の "m_2025-01" セルに 1000000 を入力する
**Then** 「広告費」の "m_2025-01" セルが自動的に 300000 になる

#### Scenario: 参照セル変更時の自動再計算

**Given** 計算行「広告費」の式が "=A0*0.3" である
**And** 「売上」の "m_2025-01" セルが 1000000 である
**When** 「売上」の "m_2025-01" セルを 1200000 に変更する
**Then** 「広告費」の "m_2025-01" セルが自動的に 360000 になる

#### Scenario: 計算行は編集不可

**Given** 計算行「広告費」が存在する
**When** ユーザーが「広告費」のセルを直接編集しようとする
**Then** セルは編集不可である
**And** セルが読み取り専用として表示される

---

### Requirement: 定数行の参照

The system MUST allow constant rows to hold coefficients (e.g., growth rate, ratios) that can be referenced by formula rows. 定数行に係数（成長率、割合など）を保持し、計算行から参照できる。

#### Scenario: 定数行に係数を入力する

**Given** ForecastPanel が表示されている
**And** 定数行「成長率」が存在する
**When** ユーザーが「成長率」の "m_2025-01" セルに "0.05" を入力する
**Then** セルの値が 0.05 になる

#### Scenario: 計算行で定数行を参照する

**Given** 定数行「成長率」の "m_2025-01" セルが 0.05 である
**And** KPI行「売上」の "m_2025-01" セルが 1000000 である
**And** 計算行「成長後売上」が存在する
**When** 「成長後売上」の "m_2025-01" セルに式 "=A0*(1+B0)" を設定する
**Then** 「成長後売上」の "m_2025-01" セルが自動的に 1050000 になる

#### Scenario: 定数変更時の自動再計算

**Given** 計算行が定数行を参照している
**And** 定数行「成長率」の値が 0.05 である
**When** 「成長率」の値を 0.10 に変更する
**Then** 参照している計算行のすべてのセルが自動的に再計算される

---

### Requirement: 過去期間のロック

The system MUST lock cells in past periods (before a configured start date) to prevent editing. 設定された基準日以前のセルを編集不可にする。

#### Scenario: 基準日以降のセルは編集可能

**Given** 基準日が "2025-01-01" である
**When** ユーザーが "m_2025-01" セルを確認する
**Then** セルは編集可能である

#### Scenario: 基準日以前のセルは編集不可

**Given** 基準日が "2025-01-01" である
**When** ユーザーが "m_2024-12" セルを確認する
**Then** セルは編集不可である
**And** セルがグレーアウト表示される

#### Scenario: 過去期間へのフィルをブロック

**Given** 基準日が "2025-01-01" である
**And** "m_2025-01" セルに値が入力されている
**When** ユーザーがフィルハンドルを "m_2024-12" までドラッグする
**Then** "m_2024-12" セルは変更されない
**And** エラーメッセージは表示されない（単に無視される）

#### Scenario: 過去期間へのペーストをブロック

**Given** 基準日が "2025-01-01" である
**And** クリップボードに値がコピーされている
**When** ユーザーが "m_2024-12" セルにペーストする
**Then** セルは変更されない

---

### Requirement: キャッシュ繰越

The system MUST automatically carry forward the ending balance of the previous month to the opening balance of the current month. 前月末残高を当月期首残高に自動繰越する。

#### Scenario: 初月の期首残高

**Given** ForecastPanel が表示されている
**And** "m_2025-01" が最初の月である
**When** 期首残高を計算する
**Then** "m_2025-01" の期首残高は 0 円である

#### Scenario: 前月繰越

**Given** "m_2025-01" の期末残高が 5000000 円である
**When** "m_2025-02" の期首残高を計算する
**Then** "m_2025-02" の期首残高は 5000000 円である

#### Scenario: 前月値変更時の自動繰越

**Given** "m_2025-01" の期末残高が 5000000 円である
**And** "m_2025-02" の期首残高が 5000000 円である
**When** "m_2025-01" のKPI値を変更し、期末残高が 6000000 円になる
**Then** "m_2025-02" の期首残高が自動的に 6000000 円に更新される

---

### Requirement: Excelライクなキーボード操作

The system MUST support Excel-like keyboard navigation (arrow keys, Enter, Tab). Excelライクなキーボード操作（矢印キー、Enter、Tab）をサポートする。

#### Scenario: 矢印キーでセル移動

**Given** "m_2025-01" セルにフォーカスがある
**When** ユーザーが右矢印キーを押す
**Then** "m_2025-02" セルにフォーカスが移動する

#### Scenario: Enterキーで下方向移動

**Given** "m_2025-01" セルにフォーカスがある
**When** ユーザーがEnterキーを押す
**Then** 次の行の "m_2025-01" セルにフォーカスが移動する

#### Scenario: Tabキーで右方向移動

**Given** "m_2025-01" セルにフォーカスがある
**When** ユーザーがTabキーを押す
**Then** "m_2025-02" セルにフォーカスが移動する

---

### Requirement: 視覚的フィードバック

The system MUST provide visual feedback for different cell types and states. セルの種別と状態に応じた視覚的フィードバックを提供する。

#### Scenario: マイナス値の赤字表示

**Given** セルの値が -100000 である
**When** セルをレンダリングする
**Then** セルのテキストが赤色で表示される

#### Scenario: 計算行の背景色

**Given** 行種別が 'formula' である
**When** 行をレンダリングする
**Then** 行の背景色が淡い青色である

#### Scenario: 過去期間のグレーアウト

**Given** 基準日が "2025-01-01" である
**And** セルが "m_2024-12" である
**When** セルをレンダリングする
**Then** セルの背景色がグレーである
**And** セルのテキストがグレーである

---

### Requirement: コピー & ペースト

The system MUST support copy and paste operations, including from/to Excel. Excelとの相互コピー/ペーストを含むコピー＆ペースト操作をサポートする。

#### Scenario: セルをコピーする

**Given** "m_2025-01" セルに 1000000 が入力されている
**When** ユーザーがCtrl+C（またはCmd+C）を押す
**Then** 値がクリップボードにコピーされる

#### Scenario: セルにペーストする

**Given** クリップボードに 1000000 がコピーされている
**And** "m_2025-02" セルにフォーカスがある
**When** ユーザーがCtrl+V（またはCmd+V）を押す
**Then** "m_2025-02" セルの値が 1000000 になる

#### Scenario: Excelからペーストする

**Given** Excelで範囲選択してコピーした（例: 3セル分の数値）
**And** "m_2025-01" セルにフォーカスがある
**When** ユーザーがCtrl+V（またはCmd+V）を押す
**Then** "m_2025-01", "m_2025-02", "m_2025-03" に値がペーストされる
**And** 過去期間のセルにはペーストされない

---

### Requirement: パフォーマンス

The system MUST render and interact with forecast tables containing up to 1000 rows and 36 columns without noticeable lag. 1000行×36列の予測テーブルを遅延なくレンダリング・操作できる。

#### Scenario: 大量行のレンダリング

**Given** 1000行×36列のダミーデータが存在する
**When** ForecastPanel を表示する
**Then** 初期レンダリングが 2秒以内に完了する

#### Scenario: フィル操作のレスポンス

**Given** 1000行×36列のデータが表示されている
**When** ユーザーがフィルハンドルで10セル分横引きする
**Then** フィル操作が 100ms 以内に完了する

#### Scenario: 式の再計算パフォーマンス

**Given** 100個の計算行が存在する
**And** すべての計算行が同一のKPI行を参照している
**When** KPI行の値を変更する
**Then** すべての計算行の再計算が 200ms 以内に完了する
