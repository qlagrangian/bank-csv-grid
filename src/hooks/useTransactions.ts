// src/hooks/useTransactions.ts
import useSWR from 'swr';
import type { TransactionRow } from '@/types/transaction';
import { useMemo } from 'react';

const fetcher = (url: string) => fetch(url).then(r=>r.json());

export function useTransactions(bank: string) {
  const { data, error, mutate } = useSWR<TransactionRow[]>(
    ['/api/transactions?bank=', bank].join(''),
    fetcher
  );

  const rows = useMemo<TransactionRow[]>(() => {
    const source = data ?? [];
    const childPattern = /-(\d{3})(?:-\d{3})*$/;
    const parentIds = new Set<string>();

    // 子ID（-001形式）から親IDを復元してマーキング
    for (const r of source) {
      if (!childPattern.test(r.id)) continue;
      const parts = r.id.split('-');
      while (parts.length > 1) {
        parts.pop();
        parentIds.add(parts.join('-'));
      }
    }

    return source.map((r) => {
      const isLinkedChild = childPattern.test(r.id);
      const isDeactivated = parentIds.has(r.id);
      return {
        ...r,
        isRegistered: true,
        isLinkedChild,
        isDeactivated,
      };
    });
  }, [data]);

  return {
    rows,
    isLoading: !error && !data,
    isError:   !!error,
    refresh:   () => mutate(),
  };
}
