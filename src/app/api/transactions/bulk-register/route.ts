// app/api/transactions/bulk-register/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { TransactionRow } from '@/types/transaction';

export async function POST(request: Request) {
  const rows: TransactionRow[] = await request.json();
  await prisma.transaction.createMany({
    data: rows.map(r => ({
      id:          r.id,
      bank:        r.bank,
      date:        new Date(r.date),
      description: r.description,
      credit:      r.credit,
      debit:       r.debit,
      balance:     r.balance,
      memo:        r.memo,
      tag:         r.tag,
    })),
    skipDuplicates: true,
  });
  return NextResponse.json({ registered: rows.length });
}
