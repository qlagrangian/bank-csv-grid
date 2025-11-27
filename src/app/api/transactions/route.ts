// src/app/api/transactions/route.ts
import { prisma } from '@/lib/prisma';
import type { BankCode } from '@/types/bank';
import type { TransactionRow } from '@/types/transaction';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Next.js App Router の Web API Request では nextUrl は使えないので
  // URL コンストラクタで searchParams を取得
  const { searchParams } = new URL(request.url);
  const bankParam = searchParams.get('bank') ?? '';
  const bank = bankParam as BankCode;

  // 必要なフィールドだけ select
  const rows = await prisma.transaction.findMany({
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
    orderBy: { date: 'desc' },
  });

  // TagAssignment から各トランザクションの最初のタグパスを構築
  const txIds = rows.map(r => r.id);
  const [assigns, tags] = await Promise.all([
    prisma.tagAssignment.findMany({
      where: { transactionId: { in: txIds } },
      select: { transactionId: true, tagId: true }
    }),
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

  // Prisma の Date → YYYY/MM/DD 文字列に変換しつつ
  // TransactionRow 形にマッピング
  const formatted: TransactionRow[] = rows.map(r => ({
    id: r.id,
    bank: r.bank as BankCode,
    date: r.date.toISOString().slice(0, 10).replace(/-/g, '/'),
    description: r.description,
    credit: r.credit,
    debit: r.debit,
    balance: r.balance ?? 0,
    memo: r.memo ?? '',
    // DBカラムのtagは使用せず、TagAssignmentからのパスを表示用に格納
    tag: firstPathByTx.get(r.id) ?? '',
    isRegistered: true,               // ← 追加
  }));

  return NextResponse.json(formatted);
}
