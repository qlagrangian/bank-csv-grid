import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

type Node = {
	id: string;
	name: string;
	order: number;
	active: boolean;
	/** 全期間合計 */
	debit: number;
	credit: number;
	/** months 配列と同じ長さ。各月の合計 */
	monthly: { debit: number; credit: number }[];
	children: Node[];
};

function parseYMD(v: string | null): { y: number; m: number; d: number } | null {
	if (!v) return null;
	const s = v.trim().replace(/\./g, '-').replace(/\//g, '-');
	const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
	if (!m) return null;
	const y = parseInt(m[1], 10);
	const mo = parseInt(m[2], 10);
	const d = parseInt(m[3], 10);
	if (!y || !mo || !d) return null;
	return { y, m: mo, d };
}

function startOfDayLocal(ymd: { y: number; m: number; d: number }): Date {
	return new Date(ymd.y, ymd.m - 1, ymd.d, 0, 0, 0, 0);
}

function endOfDayLocal(ymd: { y: number; m: number; d: number }): Date {
	return new Date(ymd.y, ymd.m - 1, ymd.d, 23, 59, 59, 999);
}

export async function GET(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const fromYMD = parseYMD(searchParams.get('from'));
		const toYMD = parseYMD(searchParams.get('to'));
		const bank = searchParams.get('bank');
		// mode=monthly 以外の値が来たら将来エラーにする余地。現状 monthly 固定扱い。
		const mode = searchParams.get('mode') || 'monthly';

		if (mode !== 'monthly') {
			return NextResponse.json({ error: 'Unsupported mode' }, { status: 400 });
		}

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
		if (fromYMD || toYMD || bank) {
			if (bank) whereTx.bank = bank;
			if (fromYMD || toYMD) {
				whereTx.date = {
					...(fromYMD ? { gte: startOfDayLocal(fromYMD) } : {}),
					...(toYMD ? { lte: endOfDayLocal(toYMD) } : {}),
				};
			}
		}

		const assigns = await prisma.tagAssignment.findMany({
			where: Object.keys(whereTx).length ? { transaction: whereTx } : {},
			include: { transaction: { select: { credit: true, debit: true, date: true } } },
		});

		// months 配列を決める: from/to 指定があればその範囲、無ければ assign に現れる月の min-max
		function ymKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
		let monthStart: { y: number; m: number } | null = null;
		let monthEnd: { y: number; m: number } | null = null;
		if (fromYMD && toYMD) {
			monthStart = { y: fromYMD.y, m: fromYMD.m };
			monthEnd = { y: toYMD.y, m: toYMD.m };
		} else if (fromYMD && !toYMD) {
			// from から assign 上の最大月
			for (const a of assigns) {
				const d = a.transaction.date;
				if (!monthEnd || d > new Date(monthEnd.y, monthEnd.m - 1, 1)) {
					monthEnd = { y: d.getFullYear(), m: d.getMonth() + 1 };
				}
			}
			monthStart = { y: fromYMD.y, m: fromYMD.m };
			if (!monthEnd) monthEnd = monthStart;
		} else if (!fromYMD && toYMD) {
			// assigns の最小月から to まで
			for (const a of assigns) {
				const d = a.transaction.date;
				if (!monthStart || d < new Date(monthStart.y, monthStart.m - 1, 1)) {
					monthStart = { y: d.getFullYear(), m: d.getMonth() + 1 };
				}
			}
			monthEnd = { y: toYMD.y, m: toYMD.m };
			if (!monthStart) monthStart = monthEnd;
		} else {
			// 両方無指定: assigns の min-max
			for (const a of assigns) {
				const d = a.transaction.date;
				const y = d.getFullYear();
				const m = d.getMonth() + 1;
				if (!monthStart || d < new Date(monthStart.y, monthStart.m - 1, 1)) monthStart = { y, m };
				if (!monthEnd || d > new Date(monthEnd.y, monthEnd.m - 1, 1)) monthEnd = { y, m };
			}
			if (!monthStart || !monthEnd) {
				// データなし: 当月一ヶ月 (空列防止)
				const now = new Date();
				monthStart = { y: now.getFullYear(), m: now.getMonth() + 1 };
				monthEnd = monthStart;
			}
		}
		// months 展開
		const months: string[] = [];
		if (monthStart && monthEnd) {
			let y = monthStart.y;
			let m = monthStart.m;
			while (y < monthEnd.y || (y === monthEnd.y && m <= monthEnd.m)) {
				months.push(`${y}-${String(m).padStart(2, '0')}`);
				m += 1;
				if (m > 12) { m = 1; y += 1; }
			}
		}

		const monthIndex = new Map<string, number>();
		months.forEach((k, i) => monthIndex.set(k, i));

		const totals = new Map<string, { debit: number; credit: number }>();
		const monthlyTotals = new Map<string, { debit: number[]; credit: number[] }>();

		function ensureMonthly(tagId: string) {
			if (!monthlyTotals.has(tagId)) {
				monthlyTotals.set(tagId, { debit: Array(months.length).fill(0), credit: Array(months.length).fill(0) });
			}
			return monthlyTotals.get(tagId)!;
		}

		function addTo(id: string, debit: number, credit: number, monthKey: string) {
			const cur = totals.get(id) ?? { debit: 0, credit: 0 };
			cur.debit += debit;
			cur.credit += credit;
			totals.set(id, cur);
			const idx = monthIndex.get(monthKey);
			if (idx != null) {
				const mt = ensureMonthly(id);
				mt.debit[idx] += debit;
				mt.credit[idx] += credit;
			}
		}

		function addToAncestors(tagId: string, debit: number, credit: number, monthKey: string) {
			let current: string | null = tagId;
			while (current) {
				addTo(current, debit, credit, monthKey);
				const t: any = byId.get(current);
				current = t ? (t.parentId ?? null) : null;
			}
		}

		for (const a of assigns) {
			const debit = typeof a.transaction.debit === 'number' ? Math.max(0, Math.trunc(a.transaction.debit)) : 0;
			const credit = typeof a.transaction.credit === 'number' ? Math.max(0, Math.trunc(a.transaction.credit)) : 0;
			if (debit === 0 && credit === 0) continue;
			const d = a.transaction.date;
			const mKey = ymKey(d);
			addToAncestors(a.tagId, debit, credit, mKey);
		}

		function build(parentId: string | null): Node[] {
			const ids = childrenByParent.get(parentId) ?? [];
			return ids.map((id) => {
				const t: any = byId.get(id);
				const sum = totals.get(id) ?? { debit: 0, credit: 0 };
				const mt = monthlyTotals.get(id) ?? { debit: Array(months.length).fill(0), credit: Array(months.length).fill(0) };
				return {
					id: t.id,
					name: t.name,
					order: t.order ?? 0,
					active: t.active ?? true,
					debit: sum.debit,
					credit: sum.credit,
					monthly: mt.debit.map((d, i) => ({ debit: d, credit: mt.credit[i] })),
					children: build(t.id),
				} as Node;
			});
		}

		const tree = build(null);
		return NextResponse.json({
			from: fromYMD ? startOfDayLocal(fromYMD).toISOString() : null,
			to: toYMD ? endOfDayLocal(toYMD).toISOString() : null,
			bank: bank ?? null,
			mode,
			months,
			tree
		});
	} catch (e) {
		console.error('[API /report GET]', e);
		return NextResponse.json({ error: String(e) }, { status: 500 });
	}
}
