/** @jest-environment node */
import { GET as exportGet } from '@/app/api/export/route';
import { prisma } from '@/lib/prisma';
import { resetDb } from './helpers';

function resToText(res: Response) { return res.text(); }

describe('GET /api/export', () => {
	beforeEach(async () => {
		await resetDb();
		// 1件だけ準備
		await prisma.transaction.create({
			data: {
				id: 'tx1',
				bank: 'paypay',
				date: new Date('2025-01-01'),
				description: 'テスト入金',
				credit: 1000,
				debit: 0,
				balance: 1000,
				memo: 'm',
				tag: 'Legacy',
			},
		});
	});

	it('returns 200 and CSV text', async () => {
		const req = { url: 'http://localhost/api/export?bank=paypay' } as any;
		const res = await exportGet(req);
		expect(res.status).toBe(200);
		const text = await resToText(res as any);
		expect(text).toContain('テスト入金');
		expect(text).toContain('Legacy');
	});
});
