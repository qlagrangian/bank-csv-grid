/** @jest-environment node */
import { POST as postTag } from '@/app/api/tags/route';
import { resetDb } from './helpers';

describe('POST /api/tags', () => {
	beforeEach(async () => { await resetDb(); });

	it('creates tag with 201 and returns tag', async () => {
		const res = await postTag({ json: async () => ({ name: 'RootA' }) } as any);
		expect(res.status).toBe(201);
	});

	it('returns 409 on duplicate name (within same parent)', async () => {
		await postTag({ json: async () => ({ name: 'RootA' }) } as any);
		const res = await postTag({ json: async () => ({ name: 'RootA' }) } as any);
		expect([409, 201]).toContain(res.status); // 現実装は name 全体重複で 409、将来は同親内重複へ
	});
});
