// src/app/api/transactions/bulk-tag/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * TagAssignment 方式で取引行のタグをまとめて置換するエンドポイント
 * 受信ボディ: Array<{ id: string; tagIds: string[] }>
 * - 各トランザクションについて既存の割当を全削除→指定IDで再作成
 * - tagIds が空配列の場合は全削除のみ（未割当）
 */
export async function PATCH(request: Request) {
  const rows: { id: string; tagIds?: string[] }[] = await request.json();

  const ops: any[] = [];
  for (const { id, tagIds } of rows) {
    const unique = Array.from(new Set(tagIds ?? []));
    ops.push(prisma.tagAssignment.deleteMany({ where: { transactionId: id } }));
    if (unique.length > 0) {
      ops.push(
        prisma.tagAssignment.createMany({
          data: unique.map((tid) => ({ transactionId: id, tagId: tid })),
          skipDuplicates: true,
        })
      );
    }
  }

  await prisma.$transaction(ops);
  return NextResponse.json({ updated: rows.length });
}
