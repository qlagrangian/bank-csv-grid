# tag-management Specification Delta

## ADDED Requirements

### Requirement: CSV Import/Exportセクションの視覚的明確性

The tag master editor MUST provide visually clear section boundaries and hierarchy for CSV import/export functionality. タグマスタエディタは、CSVインポート/エクスポート機能において、視覚的に明確なセクション境界と階層構造を提供しなければならない。

#### Scenario: Import/Exportセクションの視覚的区分

**Given** タグマスタエディタのCSVインポート/エクスポートアコーディオンを開く
**When** セクション内容を表示する
**Then** エクスポートセクションとインポートセクションが視覚的に明確に区分されている
**And** 見出し（`<h4>`）がフォント太字・適切なサイズで表示される
**And** 両セクションの間に水平罫線（`<hr>`）が表示される

#### Scenario: インポートフローの階層表示

**Given** CSVインポートセクションを表示する
**When** ステップ（1. ファイル選択、2. モード選択、3. 実行）を確認する
**Then** 各ステップに`<Label>`による見出しが付与され、操作順序が明確である
**And** 各ステップがグループ化され、余白・境界で視覚的に区分されている
**And** ファイル入力フィールドがスタイル付き（hover効果、適切なpadding）で表示される

#### Scenario: 財務アプリとしてのデザイン品質

**Given** タグマスタエディタ全体を表示する
**When** UIコンポーネントを確認する
**Then** カード、ボタン、入力フィールドが統一されたデザインシステムに従っている
**And** 文字だけでなく視覚的要素（境界線、余白、階層）でセクションが識別可能である
**And** 財務系アプリケーションとして違和感のない品質を満たしている
