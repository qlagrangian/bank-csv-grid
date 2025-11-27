// src/app/api/tags/route.ts
import { prisma } from '@/lib/prisma';
import { getTagTree } from '@/utils/tags';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/tags: 全Tag取得
export async function GET() {
  try {
    const tree = await getTagTree({ onlyActive: true });
    return NextResponse.json(tree);
  } catch (error) {
    console.error('[API /tags GET]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}


// POST /api/tags: 新規追加（nameのみ必須）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body?.name ?? '').trim();
    const parentId = body?.parentId ?? null;
    const order = Number.isFinite(body?.order) ? Number(body.order) : 0;
    const active = body?.active ?? true;

    if (!name) {
      return NextResponse.json({ error: 'Tag name required' }, { status: 400 });
    }
    if (parentId) {
      const parent = await prisma.tag.findUnique({ where: { id: parentId } });
      if (!parent) {
        return NextResponse.json({ error: 'Parent tag not found' }, { status: 400 });
      }
    }

    // 同親内での重複チェック
    const dup = await prisma.tag.findFirst({ where: { name, parentId } });
    if (dup) {
      return NextResponse.json({ error: 'Tag name already exists in the same parent' }, { status: 409 });
    }

    const tag = await prisma.tag.create({ data: { name, order, active, parentId } });
    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('[API /tags POST]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// PATCH /api/tags: idで編集
export async function PATCH(req: NextRequest) {
  try {
    const { id, name, parentId, order, active } = await req.json();
    if (!id || !name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Tag id and name required' }, { status: 400 });
    }
    const exists = await prisma.tag.findUnique({ where: { id } });
    if (!exists) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }
    // 同親内での重複名チェック（自分以外）
    const dup = await prisma.tag.findFirst({ where: { name, parentId: parentId ?? null, NOT: { id } } });
    if (dup) {
      return NextResponse.json({ error: 'Tag name already exists in the same parent' }, { status: 409 });
    }
    const tag = await prisma.tag.update({ where: { id }, data: { name, parentId: parentId ?? null, order: order ?? exists.order, active: active ?? exists.active } });
    return NextResponse.json(tag);
  } catch (error) {
    console.error('[API /tags PATCH]', error); // または PATCH/GET用
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }

}

// DELETE /api/tags?id=...: 削除（子タグ/割当がある場合は409）
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const tag = await prisma.tag.findUnique({ where: { id }, include: { children: true, assignments: { take: 1 } } });
    if (!tag) return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    if (tag.children && tag.children.length > 0) {
      return NextResponse.json({ error: 'Tag has children' }, { status: 409 });
    }
    if (tag.assignments && tag.assignments.length > 0) {
      return NextResponse.json({ error: 'Tag is assigned to transactions' }, { status: 409 });
    }

    await prisma.tag.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[API /tags DELETE]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
