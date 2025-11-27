/** @jest-environment node */
import { GET as getTags, POST as postTag } from '@/app/api/tags/route';
import { checkTagShape, resetDb } from './helpers';

function resToJson(res: Response) { return res.json(); }

describe('GET /api/tags', () => {
	beforeAll(async () => {
		await resetDb();
		// seed a few tags
		await postTag({ json: async () => ({ name: 'RootA' }) } as any);
		await postTag({ json: async () => ({ name: 'RootB' }) } as any);
	});

	it('returns 200 and array of tags', async () => {
		const res = await getTags();
		expect(res.status).toBe(200);
		const data = await resToJson(res as any);
		expect(Array.isArray(data)).toBe(true);
		if (data.length > 0) checkTagShape(data[0]);
	});
});
