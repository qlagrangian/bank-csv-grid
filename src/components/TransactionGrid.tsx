// src/components/TransactionGrid.tsx:1-45
'use client';
import React from 'react';
import { DataGrid } from 'react-data-grid';
import { buildColumns, GridKey } from '@/utils/columns';
import type { TransactionRow } from '@/types/transaction';
import { defaultColumnOptions } from '@/utils/gridDefaults';

type Props = {
  rows: TransactionRow[];
  onRowsChange: (rows: TransactionRow[]) => void;
  /** 登録済み行も編集可にするか */
  allowEditRegistered?: boolean;
};

export default function TransactionGrid({
  rows,
  onRowsChange,
  allowEditRegistered = false,
}: Props) {
  if (!rows.length) return <p>データがありません</p>;

  const columns = buildColumns(
    Object.keys(rows[0]) as GridKey[],
    allowEditRegistered
  );

  return (
    <div className="w-full h-[400px]">
      <DataGrid<TransactionRow>
        columns={columns}
        rows={rows}
        rowKeyGetter={(r) => r.id}
        onRowsChange={onRowsChange}
        defaultColumnOptions={defaultColumnOptions}
      />
    </div>
  );
}
