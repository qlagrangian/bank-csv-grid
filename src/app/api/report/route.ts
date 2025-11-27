import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

type Node = {
	id: string;
	name: string;
	order: number;
	active: boolean;
	debit: number;
	credit: number;
	children: Node[];
};

function parseDateParam(v: string | null): Date | null {
	if (!v) return null;
	// accept YYYY-MM-DD or YYYY/MM/DD
	const s = v.replace(/\//g, '-');
	const d = new Date(s);
	return isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const from = parseDateParam(searchParams.get('from'));
		const to = parseDateParam(searchParams.get('to'));
		const bank = searchParams.get('bank');

		const tags = await prisma.tag.findMany({
			orderBy: [{ parentId: 'asc' }, { order: 'asc' }, { name: 'asc' }],
		});

		const byId = new Map<string, any>();
		const childrenByParent = new Map<string | null, string[]>();
		for (const t of tags) {
			byId.set(t.id, t);
			const p = (t as any).parentId ?? null;
			const arr = childrenByParent.get(p) ?? [];
			arr.push(t.id);
			childrenByParent.set(p, arr);
		}

		const whereTx: any = {};
		if (from || to || bank) {
			if (bank) whereTx.bank = bank;
			if (from || to) whereTx.date = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
		}

		const assigns = await prisma.tagAssignment.findMany({
			where: Object.keys(whereTx).length ? { transaction: whereTx } : {},
			include: { transaction: { select: { credit: true, debit: true } } },
		});

		const totals = new Map<string, { debit: number; credit: number }>();

		function addTo(id: string, debit: number, credit: number) {
			const cur = totals.get(id) ?? { debit: 0, credit: 0 };
			cur.debit += debit;
			cur.credit += credit;
			totals.set(id, cur);
		}

		function addToAncestors(tagId: string, debit: number, credit: number) {
			let current: string | null = tagId;
			while (current) {
				addTo(current, debit, credit);
				const t: any = byId.get(current);
				current = t ? (t.parentId ?? null) : null;
			}
		}

		for (const a of assigns) {
			const debit = typeof a.transaction.debit === 'number' ? Math.max(0, Math.trunc(a.transaction.debit)) : 0;
			const credit = typeof a.transaction.credit === 'number' ? Math.max(0, Math.trunc(a.transaction.credit)) : 0;
			if (debit === 0 && credit === 0) continue;
			addToAncestors(a.tagId, debit, credit);
		}

		function build(parentId: string | null): Node[] {
			const ids = childrenByParent.get(parentId) ?? [];
			return ids.map((id) => {
				const t: any = byId.get(id);
				const sum = totals.get(id) ?? { debit: 0, credit: 0 };
				return {
					id: t.id,
					name: t.name,
					order: t.order ?? 0,
					active: t.active ?? true,
					debit: sum.debit,
					credit: sum.credit,
					children: build(t.id),
				} as Node;
			});
		}

		const tree = build(null);
		return NextResponse.json({ from: from?.toISOString() ?? null, to: to?.toISOString() ?? null, bank: bank ?? null, tree });
	} catch (e) {
		console.error('[API /report GET]', e);
		return NextResponse.json({ error: String(e) }, { status: 500 });
	}
}
