
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DataGrid, type Column } from 'react-data-grid';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { defaultColumnOptions } from '@/utils/gridDefaults';
import {
  aggregateStatement,
  toTxInput,
  type TxInput,
  type StatementLine
} from '@/utils/aggregateStatement';
import type { TransactionRow } from '@/types/transaction';

type TaglessMode = 'default' | 'empty-only' | 'never' | 'keywords';

type AggRow = {
  id: string;
  tag: string;
  side: string;
  amount: number;
  aggregated: boolean;
  index?: number;
};

export default function AggregatePanel() {
  const [txs, setTxs] = useState<TxInput[] | null>(null);
  const [lines, setLines] = useState<StatementLine[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI options for aggregateStatement
  const [dropZero, setDropZero] = useState(true);
  const [taglessMode, setTaglessMode] = useState<TaglessMode>('default');
  const [keywords, setKeywords] = useState('notag'); // comma-separated

  const isTagless = useMemo(() => {
    return (tag: string | null | undefined) => {
      if (taglessMode === 'never') return false;
      if (tag == null) return true;
      const t = tag.trim();
      if (taglessMode === 'empty-only') return t.length === 0;
      if (taglessMode === 'keywords') {
        const set = new Set(
          keywords
            .split(',')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean)
        );
        return t.length === 0 || set.has(t.toLowerCase());
      }
      // default: empty or "notag" (case-insensitive)
      return t.length === 0 || t.toLowerCase() === 'notag';
    };
  }, [keywords, taglessMode]);

  const handleAggregate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/transactions/all');
      if (!res.ok) throw new Error(`failed: ${res.status}`);
      const data: TransactionRow[] = await res.json();
      const nextTxs: TxInput[] = data.map(toTxInput);
      setTxs(nextTxs);
      const aggregated = aggregateStatement(nextTxs, { isTagless, dropZero });
      setLines(aggregated);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Re-aggregate when options change
  useEffect(() => {
    if (!txs) return;
    setLines(aggregateStatement(txs, { isTagless, dropZero }));
  }, [txs, isTagless, dropZero]);

  const rows: AggRow[] = useMemo(() => {
    if (!lines) return [];
    return lines.map((l, i) => ({
      id: `${i}`,
      tag: l.tag == null ? '' : typeof l.tag === 'string' ? l.tag : '',
      side: l.side,
      amount: l.amount,
      aggregated: l.aggregated,
      index: l.index
    }));
  }, [lines]);

  const columns: Column<AggRow>[] = useMemo(
    () => [
      { key: 'tag', name: 'タグ', width: 180 },
      { key: 'side', name: '区分', width: 80 },
      {
        key: 'amount',
        name: '金額',
        width: 120,
        renderCell: ({ row }) => (
          <div className="text-right tabular-nums">
            {row.amount.toLocaleString('ja-JP')}
          </div>
        )
      },
      { key: 'index', name: '元行Idx', width: 90 }
    ],
    []
  );

  return (
    <section className="space-y-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">全銀行データの集計</CardTitle>
          <Button onClick={handleAggregate} disabled={loading} variant="default">
            {loading ? '集計中…' : '集計'}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-gray-600">0円の行を除外</span>
              <input
                type="checkbox"
                checked={dropZero}
                onChange={(e) => setDropZero(e.target.checked)}
              />
            </label>

            <div className="flex items-center gap-2">
              <span className="text-gray-600">タグなしの判定</span>
              <Select value={taglessMode} onValueChange={(v) => setTaglessMode(v as TaglessMode)}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">空 or "notag"</SelectItem>
                  <SelectItem value="empty-only">空のみ</SelectItem>
                  <SelectItem value="keywords">キーワード指定</SelectItem>
                  <SelectItem value="never">常にタグあり扱い</SelectItem>
                </SelectContent>
              </Select>
              {taglessMode === 'keywords' && (
                <Input
                  className="w-64"
                  placeholder="例: notag, -, 未設定"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-red-600">エラー</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {lines && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">集計結果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[400px]">
              <DataGrid<AggRow>
                columns={columns}
                rows={rows}
                rowKeyGetter={(r) => r.id}
                defaultColumnOptions={defaultColumnOptions}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
