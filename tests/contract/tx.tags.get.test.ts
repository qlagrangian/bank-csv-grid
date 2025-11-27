/** @jest-environment node */
import { POST as tagPOST } from '@/app/api/tags/route';
import { GET as txTagsGET, PUT as txTagsPUT } from '@/app/api/transactions/[id]/tags/route';
import { prisma } from '@/lib/prisma';

describe('GET /api/transactions/:id/tags', () => {
	beforeEach(async () => {
		await prisma.tagAssignment?.deleteMany?.({}).catch(() => { });
		await prisma.tag.deleteMany({});
		await prisma.transaction.deleteMany({});
	});

	it('returns 200 and leaf tag ids/paths', async () => {
		const root = await tagPOST({ json: async () => ({ name: 'Root' }) } as any);
		expect([201, 409]).toContain(root.status);
		const child = await prisma.tag.create({ data: { name: 'Leaf', parentId: (await prisma.tag.findFirst({ where: { name: 'Root' } }))!.id } });

		await prisma.transaction.create({ data: { id: 't1', bank: 'paypay', date: new Date(), description: 'x', credit: 0, debit: 1 } });
		await txTagsPUT({ json: async () => ({ tagIds: [child.id] }) } as any, { params: { id: 't1' } } as any);

		const res = await txTagsGET({} as any, { params: { id: 't1' } } as any);
		expect(res.status).toBe(200);
		const data: any[] = await (res as any).json();
		expect(data).toEqual([{ id: child.id, path: 'Root>Leaf' }]);
	});
});
