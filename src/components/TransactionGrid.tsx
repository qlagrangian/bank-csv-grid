// src/components/TransactionGrid.tsx:1-45
'use client';
import React from 'react';
import { DataGrid } from 'react-data-grid';
import { buildColumns, GridKey } from '@/utils/columns';
import type { TransactionRow } from '@/types/transaction';
import { defaultColumnOptions } from '@/utils/gridDefaults';

const PDF_IMPORT_BASE =
  process.env.NEXT_PUBLIC_PDF_IMPORT_BASE || 'http://localhost:5173';

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

  columns.push({
    key: 'pdfLink',
    name: 'PDF明細割当',
    width: 140,
    frozen: true,
    renderCell: ({ row }) => (
      <button
        className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50"
        onClick={() => {
          const params = new URLSearchParams({
            parentId: row.id,
            bank: row.bank,
            date: row.date,
          });
          window.open(`${PDF_IMPORT_BASE}/?${params.toString()}`, '_blank');
        }}
      >
        PDF明細割当
      </button>
    ),
  });

  const rowClass = (row: TransactionRow) => {
    if (row.isDeactivated) return 'rdg-row-deactivated';
    if (row.isLinkedChild) return 'rdg-row-linked';
    return undefined;
  };

  return (
    <div className="w-full h-[800px]">
      <DataGrid<TransactionRow>
        columns={columns}
        rows={rows}
        rowKeyGetter={(r) => r.id}
        onRowsChange={onRowsChange}
        defaultColumnOptions={defaultColumnOptions}
        rowClass={rowClass}
        style={{ height: '100%' }}
      />
    </div>
  );
}
