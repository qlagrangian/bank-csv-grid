# Change: Forecast panel aligns with aggregate defaults and supports row insertion

## Why
- ForecastPanelの初期行・月軸がAggregatePanelとずれており、先頭列や行構成が一致していない。
- KPI/定数/計算行を追加する機構がなく、計画行を柔軟に構成できない。

## What Changes
- /api/reportのmonths（AggregatePanelの月軸）を共有し、Forecastの先頭月・列順をAggregateと一致させる。
- 期首残高→タグ階層→月合計→借入→借入合計→累積ネットの行構成を初期行として組み立て、ラベルもAggregateに揃える。
- KPI/定数/計算行を追加できるUI/ロジックを用意し、行種別に応じた編集可否・式登録をHyperformulaと同期する。
- 過去期間ロックやHF初期化ガード（buildFromArray([[]])、useColumnIndex）など既存の再発防止ポイントを維持する。

## Impact
- Affected specs: forecast-panel
- Affected code: src/components/ForecastPanel.tsx, src/utils/forecastGrid.tsx, src/types/forecast.ts, src/lib/hyperformulaAdapter.ts, src/lib/coordinateMapper.ts, src/app/page.tsx（月軸連携）
