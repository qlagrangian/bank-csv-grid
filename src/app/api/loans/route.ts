import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/loans
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bank = searchParams.get('bank');

  try {
    const where = bank ? { bank } : {};
    const loans = await prisma.loan.findMany({
      where,
      orderBy: [{ bank: 'asc' }, { occurrenceYM: 'asc' }],
    });

    return NextResponse.json(loans);
  } catch (error) {
    console.error('[API /loans GET]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// POST /api/loans
export async function POST(req: NextRequest) {
  const { bank, batchName, amount, occurrenceYM } = await req.json();

  // Validation
  if (!bank || !batchName || !amount || !occurrenceYM) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}$/.test(occurrenceYM)) {
    return NextResponse.json({ error: 'Invalid occurrenceYM format' }, { status: 400 });
  }
  if (amount <= 0) {
    return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
  }

  try {
    // Transaction: Tag auto-generation + Loan creation
    const loan = await prisma.$transaction(async (tx) => {
      // 1. Get or create bank tag (parentId = null)
      let bankTag = await tx.tag.findFirst({
        where: { name: bank, parentId: null },
      });
      if (!bankTag) {
        bankTag = await tx.tag.create({
          data: { name: bank, parentId: null, order: 0 },
        });
      }

      // 2. Create batch tag (child of bank tag)
      let batchTag;
      try {
        batchTag = await tx.tag.create({
          data: { name: batchName, parentId: bankTag.id, order: 0 },
        });
      } catch (e: any) {
        if (e.code === 'P2002') {
          // Duplicate: get existing tag
          batchTag = await tx.tag.findFirst({
            where: { name: batchName, parentId: bankTag.id },
          });
        } else {
          throw e;
        }
      }

      // 3. Create Loan
      return tx.loan.create({
        data: { bank, batchName, amount, occurrenceYM, tagId: batchTag!.id },
      });
    });

    return NextResponse.json(loan, { status: 201 });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Loan already exists' }, { status: 409 });
    }
    console.error('[API /loans POST]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
