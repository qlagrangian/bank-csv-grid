// src/utils/summary.ts
import type { Column } from 'react-data-grid';
import type { TransactionRow } from '@/types/transaction';

const yenFmt = (v?: number) => (v ? v.toLocaleString('ja-JP') : '');

const header: Record<keyof TransactionRow, string> = {
  id: 'ID',
  bank: '銀行',
  date: '日付',
  description: '摘要',
  credit: '入金',
  debit: '出金',
  balance: '残高',
  memo: 'メモ',
  tag: 'タグ',
  tagIds: 'タグID',
  isRegistered: '登録済み',
  isDirty: '未反映',
  isLinkedChild: 'PDF子行',
  isDeactivated: '非活性',
};

export function buildColumns(
  keys: (keyof TransactionRow)[] = [
    'date','description','credit','debit','balance','memo','tag','isRegistered'
  ]
): Column<TransactionRow, unknown>[] {
  return keys.map((k): Column<TransactionRow> => {
    const base = { key: k, name: header[k] };
    if (k === 'credit' || k === 'debit' || k === 'balance') {
      return {
        ...base,
        renderCell: ({ row }) => yenFmt(row[k])
      };
    }
    return base;
  });
}

export interface SummaryRow extends TransactionRow {
  id: '__summary__';
  description: '合計';
}

export function calcSummary(rows: TransactionRow[]): SummaryRow {
  const credit = rows.reduce((sum, r) => sum + r.credit, 0);
  const debit = rows.reduce((sum, r) => sum + r.debit, 0);
  const bank = rows[0]?.bank;
  return {
    id: '__summary__',
    bank,
    date: '',
    description: '合計',
    credit,
    debit,
    balance: 0,
    memo: '',
    tag: '',
    isRegistered: true,
  };
}
