# aggregate-panel Specification Delta

## ADDED Requirements

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
