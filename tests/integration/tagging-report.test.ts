/** @jest-environment node */
import { GET as exportGET } from '@/app/api/export/route';
import { POST as tagsPOST } from '@/app/api/tags/route';
import { prisma } from '@/lib/prisma';

function resJson(r: any) { return r.json(); }
function resText(r: any) { return r.text(); }

describe('Story: タグ作成 → 取引付与 → レポート/エクスポート', () => {
	beforeAll(async () => {
		// DB 初期化
		await prisma.tagAssignment?.deleteMany?.({}).catch(() => { });
		await prisma.tag.deleteMany({});
		await prisma.transaction.deleteMany({});
	});

	it('最小シナリオが通る', async () => {
		// 1) タグ作成（現状APIはnameのみ）
		const t1 = await tagsPOST({ json: async () => ({ name: 'PJ収入の部' }) } as any);
		expect(t1.status).toBe(201);
		const t2 = await tagsPOST({ json: async () => ({ name: 'SES' }) } as any);
		expect([201, 409]).toContain(t2.status);

		// 2) 取引作成（レガシー単一タグ列に保存）
		await prisma.transaction.createMany({
			data: [
				{ id: 'tx1', bank: 'paypay', date: new Date('2025-01-02'), description: '売上', credit: 10000, debit: 0, balance: 10000, memo: 'm1', tag: 'SES' },
				{ id: 'tx2', bank: 'paypay', date: new Date('2025-01-03'), description: '費用', credit: 0, debit: 2000, balance: 8000, memo: 'm2', tag: 'PJ収入の部' },
			],
			skipDuplicates: true,
		});

		// 3) エクスポート（簡易検証）
		const res = await exportGET({ url: 'http://localhost/api/export?bank=paypay' } as any);
		expect(res.status).toBe(200);
		const csv = await resText(res);
		expect(csv).toContain('売上');
		expect(csv).toContain('SES');
	});
});
