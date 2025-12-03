## ADDED Requirements
### Requirement: 集計パネルと同期した初期構成
The system MUST initialize ForecastPanel rows and columns to match AggregatePanel structure and month axis. ForecastPanelの初期行・月列は集計パネルと同じ構成・順序であること。

#### Scenario: 初期行が集計構成と一致
- **WHEN** ForecastPanel loads using months/rows derived from the aggregate data
- **THEN** the label列には順に「銀行別期首残高行群」「タグ階層行群（同一順・同一ラベル）」「月合計行」「借入残高行群」「借入合計行（存在する場合）」「累積営業ネットキャッシュ行」が並ぶ

#### Scenario: 先頭列と月順の一致
- **GIVEN** AggregatePanelのmonthsが["2024-01", "2024-02"]
- **WHEN** ForecastPanelを表示する
- **THEN** 最初の月列は"2024-01"となり、月列の順序はAggregatePanelと同じである

### Requirement: 行追加によるKPI・定数・計算の拡張
The system MUST let users insert KPI, constant, or formula rows while preserving row-type behaviors. KPI/定数/計算行を追加でき、行種別に応じた編集可否・計算ルールを保つこと。

#### Scenario: KPI行を追加する
- **WHEN** ユーザーが対象位置に「KPI行を追加」する
- **THEN** rowType "kpi" の行がその位置に挿入され、すべての月セルはnullで初期化され、editableStart以降のセルが編集可能になる

#### Scenario: 定数行を追加する
- **WHEN** ユーザーが定数行を追加する
- **THEN** rowType "constant" の行が挿入され、editableStart以降のセルを編集でき、定数行スタイルで表示される

#### Scenario: 計算行を追加する
- **WHEN** ユーザーが計算行を追加し、式（例: "=A1*1.1"）を入力する
- **THEN** 行はrowType "formula"となりセルは直接編集不可のまま、HyperFormulaに式が登録され、参照セル変更時に自動再計算される

### Requirement: 実績最終月の翌月から編集開始
The system MUST lock all months up to the latest actual month and allow editing from the following month. 実績最終月までは編集不可とし、その翌月から編集可能にする。

#### Scenario: 実績最終月に追従
- **GIVEN** actualMonthsが["2024-11", "2024-12"]で、AggregatePanelのmonthsが["2024-10", "2024-11", "2024-12", "2025-01"]
- **WHEN** ForecastPanelを表示する
- **THEN** "m_2024-10"〜"m_2024-12"のセルはロックされてグレーアウトし、"m_2025-01"以降が編集可能になる
