import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { TransactionRow } from '@/types/transaction';
import type { BankCode } from '@/types/bank';

export async function GET() {
  const rows = await prisma.transaction.findMany({
    select: {
      id:          true,
      bank:        true,
      date:        true,
      description: true,
      credit:      true,
      debit:       true,
      balance:     true,
      memo:        true,
      tag:         true,
    },
    orderBy: { date: 'desc' },
  });

  const formatted: TransactionRow[] = rows.map((r: any) => ({
    id:          r.id,
    bank:        r.bank as BankCode,
    date:        r.date.toISOString().slice(0,10).replace(/-/g,'/'),
    description: r.description,
    credit:      r.credit,
    debit:       r.debit,
    balance:     r.balance  ?? 0,
    memo:        r.memo     ?? '',
    tag:         r.tag      ?? '',
    isRegistered: true,
  }));

  return NextResponse.json(formatted);
}

