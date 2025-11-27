/** @jest-environment node */
import { POST as tagPOST } from '@/app/api/tags/route';
import { PUT as txTagsPUT } from '@/app/api/transactions/[id]/tags/route';
import { prisma } from '@/lib/prisma';

describe('PUT /api/transactions/:id/tags', () => {
	beforeEach(async () => {
		await prisma.tagAssignment?.deleteMany?.({}).catch(() => { });
		await prisma.tag.deleteMany({});
		await prisma.transaction.deleteMany({});
	});

	it('replaces tags and returns 204; non-existent -> 400; non-leaf -> 400', async () => {
		const r = await tagPOST({ json: async () => ({ name: 'A' }) } as any);
		expect([201, 409]).toContain(r.status);
		const parent = await prisma.tag.findFirst({ where: { name: 'A' } });
		const leaf = await prisma.tag.create({ data: { name: 'B', parentId: parent!.id } });

		await prisma.transaction.create({ data: { id: 't1', bank: 'paypay', date: new Date(), description: 'x', credit: 1, debit: 0 } });

		// 正常（重複を含む入力でもユニーク化され 204）
		const ok = await txTagsPUT({ json: async () => ({ tagIds: [leaf.id, leaf.id] }) } as any, { params: { id: 't1' } } as any);
		expect(ok.status).toBe(204);

		// 存在しないタグ
		const bad = await txTagsPUT({ json: async () => ({ tagIds: ['nope'] }) } as any, { params: { id: 't1' } } as any);
		expect(bad.status).toBe(400);

		// 非葉（親）
		const nonLeaf = await txTagsPUT({ json: async () => ({ tagIds: [parent!.id] }) } as any, { params: { id: 't1' } } as any);
		expect(nonLeaf.status).toBe(400);
	});
});
