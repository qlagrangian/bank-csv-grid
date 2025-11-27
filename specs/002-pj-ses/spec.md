# Feature Specification: 複数・階層タグ付与とタグ別集計レポート

**Feature Branch**: `002-pj-ses`
**Created**: 2025-09-18
**Status**: Draft
**Input**: User description: "## 前提 このプロジェクトは、銀行の明細にタグをつけ、タグごとに集計をするアプリケーションを開発するものである。 ## 実装したいこと 現状は各明細に対してタグを一つしかつけることができないが、これを複数、しかも階層構造を持ってつけられるようにしたい。 例えば、大項目として「PJ 収入の部」のタグをつけると、それの子項目である「プロジェクト売り上げ」というタグを選択できるようになり、さらに「プロジェクト売り上げ」を選択すると、それの小項目である「コンサル」・「受託開発」・「SES」などのタグが選択可能になるイメージである。また、それを元に集計を行い、レポートのようなものを自動生成できるようにしたい(直接法のキャッシュフロー計算書のようなイメージ)。既存の実装を破壊することなく、うまく拡張することで実装したい。"

## Execution Flow (main)

```
1. Parse user description from Input
	→ If empty: ERROR "No feature description provided"
2. Extract key concepts from description
	→ Identify: actors, actions, data, constraints
3. For each unclear aspect:
	→ Mark with [NEEDS CLARIFICATION: specific question]
4. Fill User Scenarios & Testing section
	→ If no clear user flow: ERROR "Cannot determine user scenarios"
5. Generate Functional Requirements
	→ Each requirement must be testable
	→ Mark ambiguous requirements
6. Identify Key Entities (if data involved)
7. Run Review Checklist
	→ If any [NEEDS CLARIFICATION]: WARN "Spec has uncertainties"
	→ If implementation details found: ERROR "Remove tech details"
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines

- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

### Section Requirements

- **Mandatory sections**: Must be completed for every feature
- **Optional sections**: Include only when relevant to the feature
- When a section doesn't apply, remove it entirely (don't leave as "N/A")

### For AI Generation

When creating this spec from a user prompt:

1. **Mark all ambiguities**: Use [NEEDS CLARIFICATION: specific question] for any assumption you'd need to make
2. **Don't guess**: If the prompt doesn't specify something (e.g., "login system" without auth method), mark it
3. **Think like a tester**: Every vague requirement should fail the "testable and unambiguous" checklist item
4. **Common underspecified areas**:
   - User types and permissions
   - Data retention/deletion policies
   - Performance targets and scale
   - Error handling behaviors
   - Integration requirements
   - Security/compliance needs

---

## User Scenarios & Testing _(mandatory)_

### Primary User Story

経理担当者として、銀行明細の各取引に対して複数の階層タグ（例: 「PJ 収入の部 > プロジェクト売り上げ > SES」）を付与し、その結果をタグ階層ごとに集計したレポート（直接法のキャッシュフロー風）を指定期間で自動生成したい。これにより、収支の内訳を粒度高く把握できる。

### Acceptance Scenarios

1. Given 未タグの取引がある, When ユーザーがタグ編集 UI で大項目「PJ 収入の部」を選択する, Then 子項目「プロジェクト売り上げ」が候補に表示され、さらに選択すると孫項目「コンサル/受託開発/SES」が選択可能になる。必要に応じて更に下位階層が存在する場合は動的に次階層が表示され、選択したタグはすべて取引に保存される。
2. Given 既存実装で単一タグのみが設定済みの取引, When ユーザーが当該取引のタグを開く, Then 既存の単一タグが保持された状態で表示され、追加で複数タグを付与できる（既存データは破壊されない）。
3. Given 「PJ 収入の部 > プロジェクト売り上げ > SES」でタグ付けされた取引が複数存在, When 指定期間でレポートを生成, Then 階層ごと（大項目/中項目/小項目）に小計・合計が算出され、親階層へロールアップされて表示される。
4. Given 同一取引に複数の葉タグを付けるケース, When レポート集計を実行, Then 重複計上を避けるための集計ルールに従って金額が計上される。[NEEDS CLARIFICATION: 同一取引に複数タグ付与時の集計ルール（重複計上/按分/主タグのみ等）]
5. Given 新たなタグや階層が必要, When ユーザーがタグマスタでタグを作成し親子関係を設定する, Then 任意の深さの階層を作成・編集でき、タグ選択 UI と集計に即時反映される。

### Edge Cases

- タグ階層の深さが 3 階層を超える場合の扱い。[NEEDS CLARIFICATION: 最大階層数の上限]
- 親タグのみ選択し子を選ばない場合に保存可否と集計上の扱い。[NEEDS CLARIFICATION]
- 同一タグの重複選択の禁止とエラーメッセージの提示。
- タグマスタの名称変更・統合・削除が既存取引に与える影響（再割当の必要性、履歴保持）。[NEEDS CLARIFICATION]
- 大量データ（例: 取引 5 万件、タグ 1 千件）時の操作性と集計時間の許容閾値。[NEEDS CLARIFICATION: パフォーマンス目標]
- 権限: タグマスタの編集可否は誰が行えるか（一般ユーザー/管理者）。[NEEDS CLARIFICATION]
- レポートの期間基準（日付種別: 取引日/起算日）とタイムゾーン。[NEEDS CLARIFICATION]
- 通貨が複数ある場合の扱い（単一通貨前提か、換算するか）。[NEEDS CLARIFICATION]
- CSV インポート/エクスポート時にタグ情報を含めるか、形式の詳細。[NEEDS CLARIFICATION]

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: システムは 1 つの取引に対して複数のタグを付与できなければならない。
- **FR-002**: システムは階層構造のタグをサポートし、親 → 子 → 孫以降の任意の階層（3 階層以上を含む）を扱える必要がある。
- **FR-003**: 親タグを選択した場合、当該親の直下の子タグ候補が提示されなければならない。
- **FR-004**: 葉タグ選択時に祖先タグの扱い（自動付与/表示のみ/明示選択必須）は明確でなければならない。[NEEDS CLARIFICATION: 選択ルール]
- **FR-005**: 同一タグの重複付与は防止されなければならない。
- **FR-006**: 既存の単一タグ付与データは変更不要でそのまま有効でなければならない（後方互換）。
- **FR-007**: 既存の単一タグが付与済みの取引に対しても、追加で複数タグを付与できなければならない。
- **FR-008**: 集計は葉レベルで金額を集約し、祖先階層へロールアップして小計/合計を算出できなければならない。
- **FR-009**: レポートは大項目 → 中項目 → 小項目の階層でグルーピングし、直接法キャッシュフローに類似した形で出力できなければならない。
- **FR-010**: レポート生成時に期間（開始日/終了日）および対象口座/銀行でフィルタできなければならない。[NEEDS CLARIFICATION: 必要なフィルタ項目]
- **FR-011**: ユーザーはタグマスタで作成/名称変更/親子関係の設定・変更/表示順の管理を行えること。[NEEDS CLARIFICATION: 管理権限者]
- **FR-012**: 収入/支出の符号や分類に一貫性があり、集計時の符号規則が明確でなければならない。[NEEDS CLARIFICATION]
- **FR-013**: タグ選択 UI は検索と複数選択をサポートし、大量タグでも操作可能でなければならない。
- **FR-014**: 生成したレポートは CSV へエクスポートできなければならない。[NEEDS CLARIFICATION: 他フォーマット要否]
- **FR-015**: 使用中タグの削除はその影響を明示し、再割当や削除ブロックなどのポリシーが必要である。[NEEDS CLARIFICATION: 運用ポリシー]
- **FR-016**: 同一ブランチ配下で複数の葉を同時選択可能か、1 件限定かのルールを定義しなければならない。[NEEDS CLARIFICATION]
- **FR-017**: 1 取引に複数タグがある場合の集計で二重計上を避けるための戦略（重複排除/按分/主タグ優先）を定義しなければならない。[NEEDS CLARIFICATION]
- **FR-018**: 既存の画面/エクスポート/インポート等の外部 I/O は後方互換を維持しなければならない。
- **FR-019**: 無効な選択や矛盾がある場合、バリデーションとわかりやすいエラーメッセージを表示しなければならない。
- **FR-020**: タグ付与/変更の履歴を記録し、監査可能でなければならない。[NEEDS CLARIFICATION: 監査の粒度と保持期間]
- **FR-021**: 任意の深さの階層に対応する動的なカスケード式タグ選択 UI を提供し、親選択に応じて次階層が追加表示されること。

### Key Entities _(include if feature involves data)_

- **Tag（タグ）**: 分類ラベル。主要属性: 名称、説明（任意）、親子関係、表示順、活性/非活性。関係: 親子の階層構造（任意の深さ）。制約: 名称の一意性スコープ。[NEEDS CLARIFICATION: 一意性は全体/階層内/同一親内?]
- **Transaction（取引）**: 銀行明細の取引。主要属性: 日付、金額、摘要。関係: 複数のタグを持ちうる。
- **Tag Assignment（タグ付与）**: 取引とタグの紐付け。主要属性: 付与日時、付与者。制約: 取引 × タグの重複不可。
- **Aggregated Report（集計レポート）**: 期間内のタグ階層別合計の結果表。主要属性: 期間、グルーピング階層、ノード別小計/合計。関係: 取引とタグから導出。

---

## Review & Acceptance Checklist

_GATE: Automated checks run during main() execution_

### Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

_Updated by main() during processing_

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed

---
