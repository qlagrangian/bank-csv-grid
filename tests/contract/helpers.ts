import { prisma } from '@/lib/prisma';

export async function resetDb() {
	await prisma.tagAssignment?.deleteMany?.({}).catch(() => { });
	await prisma.tag.deleteMany({});
	await prisma.transaction.deleteMany({});
}

export function checkTagShape(obj: any) {
	expect(typeof obj.id).toBe('string');
	expect(typeof obj.name).toBe('string');
	expect(typeof obj.active).toBe('boolean');
	expect(typeof obj.order).toBe('number');
	expect(Array.isArray(obj.children)).toBe(true);
}
