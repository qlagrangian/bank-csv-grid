// src/hooks/useImportService.ts
import { useTransactions } from '@/hooks/useTransactions';
import type { TransactionRow } from '@/types/transaction';
import { useCallback } from 'react';

/**
 * CSV インポート後の一括登録フック
 *
 * @param bank - 対象の銀行コード
 * @returns registerTransactions: (rows) => Promise<void>
 */
export function useImportService(bank: string) {
  // SWR の mutate 関数
  const { refresh } = useTransactions(bank);

  /**
   * 一括登録 & UI 再取得
   * @param rows - インポート済みの TransactionRow 配列
   */
  const registerTransactions = useCallback(
    async (rows: TransactionRow[]) => {
      if (rows.length === 0) return;
      // (1) API へ一括登録リクエスト
      await fetch('/api/transactions/bulk-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows),
      });
      // (1.5) 未登録時に選択されていたタグ(tagIds)を assignments に反映
      const payload = rows
        .map(r => ({ id: r.id, tagIds: r.tagIds ?? [] }))
        .filter(x => Array.isArray(x.tagIds));
      if (payload.length > 0) {
        await fetch('/api/transactions/bulk-tag', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      // (2) 成功したら最新データを取得（UI 再レンダリング）
      await refresh();
    },
    [bank, refresh]
  );

  return { registerTransactions };
}
