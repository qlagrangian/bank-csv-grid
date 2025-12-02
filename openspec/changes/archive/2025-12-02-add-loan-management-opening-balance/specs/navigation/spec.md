# Spec: Navigation (Side Menu)

## ADDED Requirements

### Requirement: サイドメニューの表示

The system MUST display a side menu to switch between transaction management and loan management pages. 取引管理ページと融資管理ページを切り替えるサイドメニューを表示する。

#### Scenario: サイドメニューの配置

**Given** アプリケーションを開く
**When** ページを表示する
**Then** 画面左側にサイドメニューが表示される
**And** サイドメニューの幅は256px（w-64）である
**And** コンテンツエリアがflex-1で残りの領域を占める

#### Scenario: メニュー項目の表示

**Given** サイドメニューを表示する
**When** メニューをレンダリングする
**Then** 「取引管理」リンクが表示される
**And** 「融資管理」リンクが表示される

---

### Requirement: ページ遷移

The system MUST allow page navigation by clicking links in the side menu. サイドメニューのリンクをクリックしてページを切り替える。

#### Scenario: 取引管理ページへの遷移

**Given** 融資管理ページ（/dashboard）にいる
**When** サイドメニューの「取引管理」をクリックする
**Then** ルートページ（/）に遷移する
**And** 取引Grid、タグマスター、集計パネルが表示される

#### Scenario: 融資管理ページへの遷移

**Given** 取引管理ページ（/）にいる
**When** サイドメニューの「融資管理」をクリックする
**Then** ダッシュボードページ（/dashboard）に遷移する
**And** 融資登録フォームと融資額パネルが表示される

---

### Requirement: アクティブ状態の表示

The system MUST highlight the current page in the side menu. 現在のページをハイライト表示する。

#### Scenario: アクティブリンクのスタイル

**Given** 取引管理ページ（/）にいる
**When** サイドメニューを表示する
**Then** 「取引管理」リンクの背景色が青色（`bg-blue-600`）である
**And** テキスト色が白色（`text-white`）である

#### Scenario: 非アクティブリンクのスタイル

**Given** 取引管理ページ（/）にいる
**When** サイドメニューを表示する
**Then** 「融資管理」リンクの背景色が透明である
**And** ホバー時に背景色がグレー（`hover:bg-gray-200`）になる

---

### Requirement: レイアウト統合

The system MUST integrate the side menu into RootLayout. サイドメニューをRootLayoutに統合する。

#### Scenario: RootLayoutへの配置

**Given** アプリケーションを開く
**When** layout.tsxをレンダリングする
**Then** Navigationコンポーネントが表示される
**And** childrenコンテンツがNavigationの右側に表示される

#### Scenario: 全ページでの表示

**Given** アプリケーション内の任意のページにいる
**When** ページを表示する
**Then** サイドメニューが常に表示される（共通レイアウト）

---

### Requirement: パフォーマンス要件

The system MUST meet performance requirements for page navigation. ページ遷移のパフォーマンスを保証する。

#### Scenario: ページ遷移時間

**Given** サイドメニューのリンクをクリックする
**When** ページ遷移を実行する
**Then** 遷移時間が1秒以内である

---

### Requirement: スタイルガイド

The system MUST apply consistent styling to the side menu. サイドメニューのスタイルを統一する。

#### Scenario: サイドメニューの背景

**Given** サイドメニューを表示する
**When** スタイルを適用する
**Then** 背景色がグレー（`bg-gray-100`）である
**And** 右側に境界線（`border-r`）がある

#### Scenario: リンクのパディング

**Given** メニューリンクを表示する
**When** スタイルを適用する
**Then** パディングが`px-4 py-2`である
**And** 角が丸い（`rounded`）

## MODIFIED Requirements

なし

## REMOVED Requirements

なし
