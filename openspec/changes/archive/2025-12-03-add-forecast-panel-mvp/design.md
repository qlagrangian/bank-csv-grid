# Design: 資金繰り予測パネル MVP実装

## Overview
既存の `AggregatePanel`（実績値表示専用）とは別に、編集可能な **ForecastPanel** を新規実装する。React-Data-Grid（RDG）をUIレイヤ、HyperFormula（HF）を計算エンジンとして採用し、Excelライクな操作感を提供する。

## Architecture

### 3-Layer Architecture
```
┌─────────────────────────────────────────────┐
│ UI Layer (React-Data-Grid)                  │
│                                             │
│ ForecastPanel.tsx                           │
│  ├─ 状態管理: rows, columns, expanded       │
│  ├─ イベント: onRowsChange, onFill, onPaste │
│  └─ レンダリング: DataGrid                  │
│                                             │
│ forecastGrid.tsx                            │
│  ├─ buildForecastColumns()                  │
│  └─ flattenForecastRows()                   │
└─────────────────────────────────────────────┘
                  ↓ ↑
┌─────────────────────────────────────────────┐
│ Domain Model Layer                          │
│                                             │
│ ForecastRow                                 │
│  { id, name, rowType, depth, cells[] }      │
│                                             │
│ FormulaEngine interface                     │
│  setCellValue(addr, value)                  │
│  setCellFormula(addr, formula)              │
│  getCellValue(addr): number                 │
│  onValuesUpdated(callback)                  │
└─────────────────────────────────────────────┘
                  ↓ ↑
┌─────────────────────────────────────────────┐
│ Calculation Layer (HyperFormula)            │
│                                             │
│ HyperformulaAdapter implements              │
│ FormulaEngine                               │
│  ├─ HF instance管理                         │
│  ├─ 座標マッピング (RDG key ↔ HF index)    │
│  └─ 再計算イベント購読                      │
└─────────────────────────────────────────────┘
```

### Data Flow
```
User Input (編集)
    ↓
onRowsChange (RDG)
    ↓
FormulaEngine.setCellValue/setCellFormula
    ↓
HyperFormula.setCellContents
    ↓
HF 内部再計算
    ↓
valuesUpdated イベント発火
    ↓
FormulaEngine.onValuesUpdated callback
    ↓
RDG rows を差分パッチ更新
    ↓
UI 再レンダリング
```

## Key Design Decisions

### 1. Row Types（行種別）
```typescript
type RowType =
  | 'kpi'       // KPI行: 手入力可能
  | 'constant'  // 定数行: 係数・割合を保持
  | 'formula'   // 計算行: 式で自動計算
  | 'subtotal'  // 小計行: 自動集計
  | 'total'     // 合計行: 自動集計
  | 'opening'   // 期首残高行: 自動繰越
```

### 2. Column Structure（列構造）
```typescript
type ForecastColumn = {
  key: string;          // 例: "m_2024-01"
  name: string;         // 表示名: "2024-01"
  kind: 'month';        // MVP では月次列のみ
  frozen?: boolean;     // 左固定
  editable: boolean | ((row: ForecastRow) => boolean);
};
```

### 3. Cell Coordinate Mapping（座標マッピング）
RDG の動的列キー ↔ HF の 0-based 列インデックスを管理：

```typescript
class CoordinateMapper {
  private colKeyToIndex: Map<string, number>;

  constructor(columns: ForecastColumn[]) {
    this.colKeyToIndex = new Map(
      columns.map((col, idx) => [col.key, idx])
    );
  }

  toHFAddress(rowIdx: number, colKey: string): SimpleCellAddress {
    const colIdx = this.colKeyToIndex.get(colKey);
    if (colIdx === undefined) throw new Error(`Unknown column key: ${colKey}`);
    return { sheet: 0, row: rowIdx, col: colIdx };
  }

  fromHFAddress(addr: SimpleCellAddress): { rowIdx: number; colKey: string } {
    const colKey = Array.from(this.colKeyToIndex.entries())
      .find(([_, idx]) => idx === addr.col)?.[0];
    if (!colKey) throw new Error(`Unknown column index: ${addr.col}`);
    return { rowIdx: addr.row, colKey };
  }
}
```

### 4. Editable Logic（編集可否制御）
過去期間のロック実装：

```typescript
const FORECAST_START_DATE = '2025-01-01'; // 基準日

function isCellEditable(row: ForecastRow, colKey: string): boolean {
  // 計算行・小計行・合計行は常に読み取り専用
  if (['formula', 'subtotal', 'total'].includes(row.rowType)) {
    return false;
  }

  // 月次列の日付チェック
  if (colKey.startsWith('m_')) {
    const monthStr = colKey.replace('m_', ''); // "2024-01"
    const cellDate = new Date(monthStr + '-01');
    const forecastStart = new Date(FORECAST_START_DATE);

    return cellDate >= forecastStart; // 未来期間のみ編集可
  }

  return true;
}
```

### 5. Fill Handle（フィルハンドル）
横引きロジック：

```typescript
function onFill({ sourceRow, targetRow, sourceColKey, targetColKey }: FillEvent) {
  // 編集可否チェック
  if (!isCellEditable(targetRow, targetColKey)) {
    return targetRow; // 変更なし
  }

  // KPI/定数行の場合、同値コピー
  if (['kpi', 'constant'].includes(sourceRow.rowType)) {
    return {
      ...targetRow,
      cells: {
        ...targetRow.cells,
        [targetColKey]: sourceRow.cells[sourceColKey]
      }
    };
  }

  return targetRow; // 計算行は変更なし（式は自動計算）
}
```

## Technical Specifications

### Dependencies
```json
{
  "dependencies": {
    "hyperformula": "^2.7.1"
  }
}
```

### File Structure
```
src/
├── components/
│   └── ForecastPanel.tsx           # メインコンポーネント
├── utils/
│   └── forecastGrid.tsx            # 行・列構築ロジック
├── types/
│   └── forecast.ts                 # 型定義
└── lib/
    ├── formulaEngine.ts            # FormulaEngine interface
    └── hyperformulaAdapter.ts      # HF実装
```

### Type Definitions
```typescript
// src/types/forecast.ts

export type RowType = 'kpi' | 'constant' | 'formula' | 'subtotal' | 'total' | 'opening';

export interface ForecastRow {
  id: string;
  name: string;
  rowType: RowType;
  depth: number;
  cells: Record<string, number | null>; // { "m_2024-01": 1000, ... }
  formula?: string; // 計算行の場合の式
  expanded?: boolean;
  childrenCount?: number;
}

export interface ForecastColumn {
  key: string;
  name: string;
  kind: 'month';
  frozen?: boolean;
  editable: boolean | ((row: ForecastRow) => boolean);
}
```

### FormulaEngine Interface
```typescript
// src/lib/formulaEngine.ts

export interface SimpleCellAddress {
  sheet: number;
  row: number;
  col: number;
}

export interface FormulaEngine {
  setCellValue(addr: SimpleCellAddress, value: number): void;
  setCellFormula(addr: SimpleCellAddress, formula: string): void;
  getCellValue(addr: SimpleCellAddress): number | null;
  onValuesUpdated(callback: (changes: SimpleCellAddress[]) => void): void;
  destroy(): void;
}
```

## Performance Considerations

### Memoization
```typescript
const columns = useMemo(
  () => buildForecastColumns(months),
  [months]
);

const rows = useMemo(
  () => flattenForecastRows(rawRows, expanded),
  [rawRows, expanded]
);
```

### Batch Updates
HyperFormulaへの更新は一括で行う：
```typescript
// ❌ Bad: 個別更新
cells.forEach(cell => {
  engine.setCellValue(cell.addr, cell.value);
});

// ✅ Good: 一括更新
const updates = cells.map(cell => ({ addr: cell.addr, value: cell.value }));
engine.batchSetCellValues(updates);
```

### Virtualization
React-Data-Grid の仮想スクロールを活用（標準機能）。大量行でも描画負荷を抑える。

## Testing Strategy

### Unit Tests
- `forecastGrid.tsx` の行・列構築ロジック
- `CoordinateMapper` の座標変換
- `isCellEditable` の日付判定
- `HyperformulaAdapter` の式設定・取得

### Integration Tests
- フィルハンドルの動作
- 式の自動再計算
- 過去期間ロックの検証

### Performance Tests
- 1000行×36列のレンダリング時間（目標: < 2秒）
- フィル操作のレスポンス時間（目標: < 100ms）

## Migration Path
MVP実装後の拡張計画：

1. **Phase 3**: データベース永続化
   - Prisma schema拡張（Forecast モデル）
   - API endpoint追加（`/api/forecast`）

2. **Phase 4**: シナリオ機能
   - シナリオ切り替えUI
   - HyperFormulaの複数シート活用

3. **Phase 5**: 高度な式
   - `=SUM()`, `=IF()`, `=AVERAGE()` など
   - 式エディタUI

## Open Questions
- [ ] HyperFormulaの商用ライセンス購入が必要か？（AGPLv3の商用利用条件確認）
- [ ] 初期データはどこから取得するか？（手入力 or インポート）
- [ ] 編集履歴（Undo/Redo）は必要か？
