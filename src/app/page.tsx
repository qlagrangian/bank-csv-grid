// src/app/page.tsx:1-120　
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic             from 'next/dynamic';
import type { BankCode }   from '@/types/bank';
import FileImporter        from '@/components/FileImporter';
import ExportModal         from '@/components/ExportModal';
import TransactionGrid     from '@/components/TransactionGrid';
import { useTransactions } from '@/hooks/useTransactions';
import { useImportService } from '@/hooks/useImportService';
import AggregatePanel      from '@/components/AggregatePanel';

const DynamicTagMasterEditor = dynamic(
  async () => (await import('@/components/TagMasterEditor')).TagMasterEditor,
  { ssr: false }
);

export default function Page() {
  const [bank, setBank] = useState<BankCode>('gmo');
  const { rows, isLoading, refresh } = useTransactions(bank);
  const { registerTransactions }     = useImportService(bank);
  const [localRows, setLocalRows]    = useState(rows);
  const [editRegistered, setEditRegistered] = useState(false);
  const [isSaving, setIsSaving]      = useState(false);

  useEffect(() => {
    setLocalRows(rows.map(r => ({ ...r })));
  }, [rows]);

  const diff = useMemo(() => ({
    newRows:      localRows.filter(r => !r.isRegistered && r.tag),
    changedTags:  localRows.filter(r => {
      if (!r.isRegistered) return false;
      const original = rows.find(o => o.id === r.id);
      return original && original.tag !== r.tag;
    })
  }), [localRows, rows]);

/* 一括反映 */
  const handleBulkRegister = async () => {
    if (!diff.newRows.length && !diff.changedTags.length) return;
    setIsSaving(true);

    try {
      if (diff.newRows.length) {
        await fetch('/api/transactions/bulk-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(diff.newRows),
        });
      }
      if (diff.changedTags.length) {
        await fetch('/api/transactions/bulk-tag', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(diff.changedTags.map((r) => ({ id: r.id, tag: r.tag }))),
        });
      }

      const newIds     = diff.newRows.map((r) => r.id);
      const changedIds = diff.changedTags.map((r) => r.id);
      setLocalRows((prev) =>
        prev.map((r) =>
          newIds.includes(r.id) || changedIds.includes(r.id)
            ? { ...r, isRegistered: true, isDirty: false }
            : r
        )
      );
      await refresh();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="p-6 space-y-4">
      {/* インポート／エクスポート */}
      <div className="flex items-center space-x-2">
        <FileImporter
          bank={bank}
          onBankChange={setBank}
          onComplete={registerTransactions}
        />
        <ExportModal bank={bank} />
      </div>

      {isLoading && <p>読み込み中…</p>}

      {/* 内部勘定マスター */}
      <section>
        <DynamicTagMasterEditor />
      </section>
      {/* 編集モード切替 */}
      <label className="flex items-center gap-1 text-sm">
        <input
          type="checkbox"
          checked={editRegistered}
          onChange={(e) => setEditRegistered(e.target.checked)}
        />
        登録済みも編集する
      </label>

      {/* グリッド */}
      <TransactionGrid
        rows={localRows}
        onRowsChange={setLocalRows}
      />

      {/* 一括反映ボタン（既存） */}
      <div className="flex justify-end">
        <button
          onClick={handleBulkRegister}
          disabled={isSaving || (!diff.newRows.length && !diff.changedTags.length)}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          内部勘定反映
        </button>
      </div>
      {/* 集計パネル（全銀行を対象） */}
      <AggregatePanel />
    </main>
  );
}
