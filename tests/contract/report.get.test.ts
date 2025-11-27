/** @jest-environment node */
import { GET as reportGET } from '@/app/api/report/route';
import { POST as tagsPOST } from '@/app/api/tags/route';
import { prisma } from '@/lib/prisma';

function resJson(r: any) { return r.json(); }

describe('GET /api/report (monthly)', () => {
	beforeAll(async () => {
		// reset DB
		await prisma.tagAssignment?.deleteMany?.({}).catch(() => { });
		await prisma.tag.deleteMany({});
		await prisma.transaction.deleteMany({});

		// Tags: Root -> Income, Expense
		const rootIncomeRes = await tagsPOST({ json: async () => ({ name: 'Income' }) } as any);
		const rootIncome = await rootIncomeRes.json();
		const rootExpenseRes = await tagsPOST({ json: async () => ({ name: 'Expense' }) } as any);
		const rootExpense = await rootExpenseRes.json();

		// Child tag for SES under Income
		const sesRes = await tagsPOST({ json: async () => ({ name: 'SES', parentId: rootIncome.id }) } as any);
		const ses = await sesRes.json();

		// Transactions across 2 months
		await prisma.transaction.createMany({
			data: [
				{ id: 't1', bank: 'paypay', date: new Date('2025-01-05'), description: '売上1', credit: 10000, debit: 0, balance: 10000, memo: 'm', tag: null },
				{ id: 't2', bank: 'paypay', date: new Date('2025-01-06'), description: '費用1', credit: 0, debit: 3000, balance: 7000, memo: 'm', tag: null },
				{ id: 't3', bank: 'paypay', date: new Date('2025-02-10'), description: '売上2', credit: 20000, debit: 0, balance: 27000, memo: 'm', tag: null },
			],
			skipDuplicates: true,
		});

		// Assign only credits to SES
		await prisma.tagAssignment.create({ data: { transactionId: 't1', tagId: ses.id } });
		await prisma.tagAssignment.create({ data: { transactionId: 't3', tagId: ses.id } });
	});

	it('returns hierarchical monthly slices', async () => {
		const res = await reportGET({ url: 'http://localhost/api/report?mode=monthly&from=2025-01-01&to=2025-02-28&bank=paypay' } as any);
		expect(res.status).toBe(200);
		const body = await resJson(res);
		expect(body.mode).toBe('monthly');
		expect(body.months).toEqual(['2025-01', '2025-02']);
		expect(Array.isArray(body.tree)).toBe(true);
		// find SES node
		const income = body.tree.find((n: any) => n.name === 'Income');
		expect(income).toBeTruthy();
		const ses = income.children.find((c: any) => c.name === 'SES');
		expect(ses).toBeTruthy();
		// monthly length matches months
		expect(ses.monthly.length).toBe(body.months.length);
		// total credit across months
		const monthlyCredit = ses.monthly.map((m: any) => m.credit);
		expect(monthlyCredit).toEqual([10000, 20000]);
		expect(ses.credit).toBe(30000);
	});
});
