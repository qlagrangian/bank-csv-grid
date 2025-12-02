import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/loans/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { amount, occurrenceYM } = await req.json();

  const data: any = {};
  if (amount !== undefined) data.amount = amount;
  if (occurrenceYM !== undefined) {
    if (!/^\d{4}-\d{2}$/.test(occurrenceYM)) {
      return NextResponse.json({ error: 'Invalid occurrenceYM' }, { status: 400 });
    }
    data.occurrenceYM = occurrenceYM;
  }

  try {
    const loan = await prisma.loan.update({ where: { id }, data });
    return NextResponse.json(loan);
  } catch (e: any) {
    if (e.code === 'P2025') {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }
    console.error('[API /loans PATCH]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/loans/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({ where: { id } });
      if (!loan) throw new Error('Loan not found');

      // Check TagAssignment usage
      if (loan.tagId) {
        const assignCount = await tx.tagAssignment.count({
          where: { tagId: loan.tagId },
        });
        if (assignCount === 0) {
          // Delete unused tag
          await tx.tag.delete({ where: { id: loan.tagId } });
        }
      }

      await tx.loan.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === 'Loan not found') {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }
    console.error('[API /loans DELETE]', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
