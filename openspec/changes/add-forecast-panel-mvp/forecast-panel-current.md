# ForecastPanel 現状まとめ (2025-12-03 時点)

## フォールバック/ログ
- `actualMonths` が `YYYY-MM` 形式でない要素を含む場合は破棄し、`console.warn("[ForecastPanel] Dropped invalid actualMonths", …)` を出力。
- 正常化後に月が空の場合は「現在月のみ」を採用し、`console.warn("[ForecastPanel] actualMonths empty or invalid; falling back to current month", …)` を出力。

## 振る舞い
- 実績月 (`actualMonths`) をユニーク＋ソートし、その最終月の翌月以降を編集可能に設定。
- 足りない分は将来月を追加して全体で 12 ヶ月を表示。実績が無い場合も現在月から 12 ヶ月生成。
- KPI/定数行のみ編集可。計算行は HyperFormula で自動計算、Opening 行は累積繰越式をセット。
- 過去期間セルはグレーアウト＆非編集。エラーセルは赤背景＋ツールチップ表示。
- Fill/Copy/Paste:
  - 式を含むセルは式ごとコピー（計算行は対象外）。
  - 値コピーは数値化できない場合 null として扱う。
- `actualMonths` 変化時に行データと HyperFormula を再初期化。

## 未完タスク
- `openspec/changes/add-forecast-panel-mvp/tasks.md` に残る未完:
  - 0.2 パフォーマンステスト
  - 5.2 統合テスト
  - 5.3 パフォーマンステスト
  - 5.4 ドキュメント更新

