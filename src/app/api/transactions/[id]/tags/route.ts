import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

async function ensureTransactionExists(id: string) {
	const tx = await prisma.transaction.findUnique({ where: { id } });
	console.log(tx);
	return !!tx;
}

async function isLeafTag(tagId: string) {
	const child = await prisma.tag.findFirst({ where: { parentId: tagId } });
	return !child;
}

async function buildTagPath(tagId: string): Promise<string> {
	const names: string[] = [];
	let currentId: string | null = tagId;
	while (currentId) {
		const t: any = await prisma.tag.findUnique({ where: { id: currentId } });
		if (!t) break;
		names.unshift(t.name);
		// @ts-ignore parentId exists in schema
		currentId = (t as any).parentId ?? null;
	}
	return names.join('>');
}

type Params = { id: string };

export async function GET(_req: NextRequest, ctx: { params: Promise<Params> }) {
	try {
		const { id } = await ctx.params;
		const exists = await ensureTransactionExists(id);
		if (!exists) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

		const assigns = await prisma.tagAssignment.findMany({ where: { transactionId: id } });
		const result = await Promise.all(
			assigns.map(async (a) => ({ id: a.tagId, path: await buildTagPath(a.tagId) }))
		);
		return NextResponse.json(result);
	} catch (e) {
		console.error('[API tx/:id/tags GET]', e);
		return NextResponse.json({ error: String(e) }, { status: 500 });
	}
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
	try {
		const id = ctx.params.id;
		const body = await req.json();
		const tagIds: string[] = Array.isArray(body?.tagIds) ? body.tagIds : [];
		if (!Array.isArray(tagIds)) {
			return NextResponse.json({ error: 'tagIds array required' }, { status: 400 });
		}

		const exists = await ensureTransactionExists(id);
		if (!exists) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });

		// remove duplicates
		const unique = Array.from(new Set(tagIds));
		// existence check
		const tags = await prisma.tag.findMany({ where: { id: { in: unique } } });
		if (tags.length !== unique.length) {
			return NextResponse.json({ error: 'One or more tagIds do not exist' }, { status: 400 });
		}
		// leaf check
		for (const tid of unique) {
			const leaf = await isLeafTag(tid);
			if (!leaf) {
				return NextResponse.json({ error: 'Only leaf tags can be assigned' }, { status: 400 });
			}
		}

		await prisma.$transaction([
			prisma.tagAssignment.deleteMany({ where: { transactionId: id } }),
			prisma.tagAssignment.createMany({
				data: unique.map((tid) => ({ transactionId: id, tagId: tid })),
				skipDuplicates: true,
			}),
		]);

		// audit placeholder
		console.log('[audit] replace tags', { transactionId: id, tagIds: unique });

		return new NextResponse(null, { status: 204 });
	} catch (e) {
		console.error('[API tx/:id/tags PUT]', e);
		return NextResponse.json({ error: String(e) }, { status: 500 });
	}
}
