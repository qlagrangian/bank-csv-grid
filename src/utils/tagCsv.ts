import { Readable } from 'stream';
import { Tag } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { prisma } from '@/lib/prisma';

const MAX_DEPTH = 6;

export type CsvRow = {
  levels: string[];
  order?: number;
  active?: boolean;
  line: number;
};

export type ImportMode = 'merge' | 'replace';

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  warnings: { line: number; message: string }[];
  errors: { line: number; message: string }[];
};

function parseBool(v: string | undefined): boolean | undefined {
  if (v === undefined) return undefined;
  const s = v.trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'no') return false;
  return undefined;
}

export async function parseCsv(content: string): Promise<CsvRow[]> {
  const clean = content.replace(/^\uFEFF/, ''); // strip BOM if present
  const lines = clean.split(/\r?\n/);
  if (!lines.length) return [];
  const header = lines[0].split(',').map((h) => h.trim());
  const levelIndexes = header
    .map((h, idx) => ({ h, idx }))
    .filter(({ h }) => /^level\d+/i.test(h));
  levelIndexes.sort((a, b) => a.idx - b.idx);
  const orderIdx = header.findIndex((h) => h.toLowerCase() === 'order');
  const activeIdx = header.findIndex((h) => h.toLowerCase() === 'active');
  if (!levelIndexes.length) {
    throw new Error('Level columns (Level1, Level2, ...) are required');
  }
  if (levelIndexes.length > MAX_DEPTH) {
    throw new Error(`Max depth ${MAX_DEPTH} exceeded`);
  }

  const rows: CsvRow[] = [];
  // 継承型のパス: 空セルは直前の値を引き継ぐ
  const currentLevels: (string | null)[] = Array(MAX_DEPTH).fill(null);

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim()) continue;
    const cols = raw.split(',');
    const rawLevels = levelIndexes.map(({ idx }) => (cols[idx] ?? '').trim());

    // レベルを更新（空欄は前回の値を引き継ぎ、非空はその階層で上書き＋下位リセット）
    let sawValue = false;
    rawLevels.forEach((val, idx) => {
      if (val) {
        currentLevels[idx] = val;
        for (let k = idx + 1; k < MAX_DEPTH; k++) currentLevels[k] = null;
        sawValue = true;
      }
    });
    if (!sawValue && currentLevels[0] === null) {
      // 何も埋まっておらず、ルート未定義
      throw new Error(`Missing Level1 at line ${i + 1}`);
    }
    if (!currentLevels[0]) {
      throw new Error(`Missing Level1 at line ${i + 1}`);
    }
    const lastFilled = currentLevels.reduce(
      (m, v, idx) => (v ? idx : m),
      -1
    );
    const levels = currentLevels.slice(0, lastFilled + 1).map((v) => v as string);
    const order =
      orderIdx >= 0 && cols[orderIdx] !== undefined && cols[orderIdx].trim()
        ? Number(cols[orderIdx])
        : undefined;
    const active =
      activeIdx >= 0 ? parseBool(cols[activeIdx]) : undefined;
    rows.push({
      levels,
      order: Number.isFinite(order) ? Number(order) : undefined,
      active,
      line: i + 1,
    });
  }
  return rows;
}

export async function importTags(
  rows: CsvRow[],
  mode: ImportMode,
  dryRun: boolean
): Promise<ImportResult> {
  const errors: ImportResult['errors'] = [];
  const warnings: ImportResult['warnings'] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;

  // validate rows
  for (const r of rows) {
    if (!r.levels.length) {
      errors.push({ line: r.line, message: 'No levels found' });
      continue;
    }
    if (r.levels.length > MAX_DEPTH) {
      errors.push({ line: r.line, message: `Depth exceeds ${MAX_DEPTH}` });
    }
  }
  if (errors.length) return { created, updated, skipped, warnings, errors };

  if (!dryRun && mode === 'replace') {
    // 既存のタグ割当を削除してからタグを全削除（外部キー制約対策）
    await prisma.tagAssignment.deleteMany({});
    await prisma.tag.deleteMany({});
  }

  // cache parent lookup to reduce DB hits
  const parentCache = new Map<string, Tag | null>();
  parentCache.set('', null);

  for (const r of rows) {
    if (!r.levels.length) {
      skipped++;
      continue;
    }
    let parentId: string | null = null;
    let parentPath = '';
    for (let i = 0; i < r.levels.length; i++) {
      const name = r.levels[i];
      parentPath = parentPath ? `${parentPath}>${name}` : name;
      const cacheKey: string = `${parentId ?? ''}/${name}`;
      let tag = parentCache.get(cacheKey) || null;
      if (!tag && !dryRun) {
        try {
          const existing: any = await prisma.tag.findFirst({
            where: { name, parentId: parentId ?? null },
          });
          if (existing) {
            tag = await prisma.tag.update({
              where: { id: existing.id },
              data: {
                order: r.order ?? existing.order,
                active: r.active ?? existing.active,
              },
            });
            updated++;
          } else {
            tag = await prisma.tag.create({
              data: {
                name,
                parentId,
                order: r.order ?? 0,
                active: r.active ?? true,
              },
            });
            created++;
          }
        } catch (e) {
          if (
            e instanceof PrismaClientKnownRequestError &&
            e.code === 'P2002'
          ) {
            warnings.push({
              line: r.line,
              message: `Duplicate tag skipped: ${name}`,
            });
            skipped++;
            continue;
          }
          throw e;
        }
      } else if (!tag && dryRun) {
        // assume creation in dryRun
        created++;
        tag = {
          id: `dry-${parentPath}`,
          name,
          active: r.active ?? true,
          order: r.order ?? 0,
          parentId,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any;
      } else {
        skipped++;
      }
      parentCache.set(cacheKey, tag);
      parentId = tag?.id ?? null;
    }
  }

  return { created, updated, skipped, warnings, errors };
}

export async function exportTagsToCsv(): Promise<string> {
  const tags = await prisma.tag.findMany({
    orderBy: [{ parentId: 'asc' }, { order: 'asc' }, { name: 'asc' }],
  });
  const byParent = new Map<string | null, any[]>();
  for (const t of tags) {
    const key = (t as any).parentId ?? null;
    const arr = byParent.get(key) ?? [];
    arr.push(t);
    byParent.set(key, arr);
  }
  const lines: string[] = [];
  const maxDepth = MAX_DEPTH;
  const header = [
    ...Array.from({ length: maxDepth }, (_, i) => `Level${i + 1}`),
    'Order',
    'Active',
  ];
  lines.push(header.join(','));
  function walk(nodes: any[], depth: number, prefix: string[]) {
    for (const n of nodes) {
      const levels: string[] = Array(maxDepth).fill('');
      prefix.forEach((p, idx) => (levels[idx] = p));
      levels[depth] = n.name;
      const row = [
        ...levels,
        String((n as any).order ?? 0),
        String((n as any).active ?? true),
      ];
      lines.push(row.join(','));
      const children = byParent.get(n.id) ?? [];
      if (children.length && depth + 1 < maxDepth) {
        walk(children, depth + 1, [...prefix, n.name]);
      }
    }
  }
  const roots = byParent.get(null) ?? [];
  walk(roots, 0, []);
  return lines.join('\n');
}
