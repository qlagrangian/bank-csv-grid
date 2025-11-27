// src/app/api/export/route.ts
import { prisma } from '@/lib/prisma';
import type { BankCode } from '@/types/bank';
import type { TransactionRow } from '@/types/transaction';
import { toCsv } from '@/utils/exporter';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // nextUrl ではなく URL
  const { searchParams } = new URL(request.url);
  const bankParam = searchParams.get('bank') ?? '';
  const bank = bankParam as BankCode;

  // TransactionRow の形に合う列だけ select
  const dbRows = await prisma.transaction.findMany({
    where: { bank },
    select: {
      id: true,
      bank: true,
      date: true,
      description: true,
      credit: true,
      debit: true,
      balance: true,
      memo: true,
    },
  });
  const txIds = dbRows.map(r => r.id);
  const [assigns, tags] = await Promise.all([
    prisma.tagAssignment.findMany({ where: { transactionId: { in: txIds } }, select: { transactionId: true, tagId: true } }),
    prisma.tag.findMany({ select: { id: true, name: true, parentId: true } })
  ]);
  const tagMap = new Map(tags.map(t => [t.id, { name: t.name, parentId: (t as any).parentId as string | null }]));
  function buildPath(tagId: string): string {
    const names: string[] = [];
    let cur: string | null = tagId;
    const guard = new Set<string>();
    while (cur && !guard.has(cur)) {
      guard.add(cur);
      const t = tagMap.get(cur);
      if (!t) break;
      names.unshift(t.name);
      cur = t.parentId ?? null;
    }
    return names.join('>');
  }
  const firstPathByTx = new Map<string, string>();
  for (const a of assigns) {
    if (!firstPathByTx.has(a.transactionId)) {
      firstPathByTx.set(a.transactionId, buildPath(a.tagId));
    }
  }
  const data: TransactionRow[] = dbRows.map((r: any) => ({
    id: r.id,
    bank: r.bank as BankCode,
    date: r.date.toISOString().slice(0, 10).replace(/-/g, '/'),
    description: r.description,
    credit: r.credit,
    debit: r.debit,
    balance: r.balance ?? 0,
    memo: r.memo ?? '',
    tag: firstPathByTx.get(r.id) ?? '',
    isRegistered: true,
  }));

  const csv = toCsv(bank, data, {
    headers: ['取引日', '内容', '入金', '出金', '残高', 'メモ', 'タグ'],
  });

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${bank}-export.csv"`,
    },
  });
}
