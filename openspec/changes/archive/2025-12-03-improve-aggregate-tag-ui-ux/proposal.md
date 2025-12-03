# Change: AggregatePanelとタグ定義UIの改善

## Why

現在、AggregatePanelは表の高さが520pxに固定されており、上下に仕切られた状態で全データを確認できない。また、タグマスタエディタのCSVインポート/エクスポートセクションは文字のみで構成されており、セクション境界や機能が視覚的に分かりにくい。財務系アプリとして、データの確認性とUI品質を向上させる必要がある。

## What Changes

### AggregatePanel
- グリッド高さを520pxから2080px（約4倍）に拡大し、十分なスクロール領域を確保
- 全データを展開した状態でも快適に閲覧可能な表示領域を担保

### TagMasterEditor
- CSV Import/Exportセクションの視覚的改善
- セクション見出しをより明確にし、機能区分を明示
- カード、境界線、余白などのUIコンポーネントを充実させ、財務アプリとして違和感のないデザインに統一

## Impact

- Affected specs: `aggregate-panel`, `tag-management`
- Affected code:
  - `src/components/AggregatePanel.tsx` (line 240: グリッド高さ定義)
  - `src/components/TagMasterEditor.tsx` (lines 196-284: CSVインポート/エクスポートUI)
- User Experience: データ閲覧性の向上、セクション認識性の向上
