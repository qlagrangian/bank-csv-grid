## 1. Implementation
- [ ] 月軸をAggregatePanelと共有し、months/先頭列/列順を揃える（editableStartは実績最終月の翌月）。
- [ ] 期首残高→タグ階層→月合計→借入→借入合計→累積ネットの初期行を構築し、ラベルと行順をAggregateに揃える。
- [ ] KPI/定数/計算行の追加UI・挿入ロジックを実装し、行種別の編集可否とHyperformula再構築を正しく行う。
- [ ] 再発防止ポイント（過去期間ロック、buildFromArray([[]]) + useColumnIndex、vendor除外、実績月のYYYY-MM正規化と警告ログ）を維持する。
- [ ] テスト・ビルド確認（grid/mapper/HFのユニットテスト拡充、`npm test -- --runInBand`、`npm run build -- --no-lint`）。ローカル開発時は `npm run dev -- --port 3002` を使用する。
