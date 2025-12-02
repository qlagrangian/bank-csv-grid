// api/transactions/link-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import type { BankCode } from '@/types/bank';

const allowOrigin =
  process.env.PDF_IMPORT_ORIGIN?.trim() || 'http://localhost:5173';

function withCors(res: NextResponse) {
  res.headers.set('Access-Control-Allow-Origin', allowOrigin);
  res.headers.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return res;
}

const RowSchema = z.object({
  id: z.string().min(1),
  bank: z.string().min(1),
  date: z.string().min(4),
  description: z.string().optional().default(''),
  credit: z.number(),
  debit: z.number(),
  balance: z.number().nullable().optional(),
  memo: z.string().nullable().optional(),
});

const BodySchema = z.object({
  parentId: z.string().min(1),
  parentBank: z.string().min(1),
  parentDate: z.string().min(4),
  rows: z.array(RowSchema).min(1),
});

const toDate = (value: string) => {
  // YYYY/MM/DD 形式を安全に Date へ
  return new Date(value.replace(/\//g, '-'));
};

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  try {
    const body = BodySchema.parse(await req.json());
    const { parentId, parentBank, rows } = body;

    // バリデーション: 行の銀行が親と一致すること
    if (rows.some((r) => r.bank !== parentBank)) {
      return withCors(
        NextResponse.json(
          { message: 'row.bank must match parentBank' },
          { status: 400 }
        )
      );
    }

    // 既存の子行を削除して置き換え
    await prisma.transaction.deleteMany({
      where: { id: { startsWith: `${parentId}-` } },
    });

    await prisma.transaction.createMany({
      data: rows.map((r) => ({
        id: r.id,
        bank: r.bank as BankCode,
        date: toDate(r.date),
        description: r.description ?? '',
        credit: r.credit,
        debit: r.debit,
        balance: r.balance ?? null,
        memo: r.memo ?? null,
      })),
      skipDuplicates: true,
    });

    return withCors(
      NextResponse.json({
        linked: rows.length,
      })
    );
  } catch (err: any) {
    const message = err?.message ?? 'Unknown error';
    return withCors(NextResponse.json({ message }, { status: 400 }));
  }
}
