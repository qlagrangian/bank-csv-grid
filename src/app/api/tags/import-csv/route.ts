import { NextRequest, NextResponse } from 'next/server';
import { importTags, parseCsv, ImportMode } from '@/utils/tagCsv';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const mode = (url.searchParams.get('mode') as ImportMode) || 'merge';
    const dryRun = url.searchParams.get('dryRun') === 'true';

    let text = '';
    const contentType = req.headers.get('content-type') || '';
    if (contentType.startsWith('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!file || !(file instanceof File)) {
        return NextResponse.json(
          { error: 'file is required' },
          { status: 400 }
        );
      }
      text = await file.text();
    } else {
      const body = await req.json().catch(() => null);
      text = body?.csv || '';
    }

    if (!text.trim()) {
      return NextResponse.json({ error: 'csv is empty' }, { status: 400 });
    }

    const rows = await parseCsv(text);
    const result = await importTags(rows, mode, dryRun);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /tags/import-csv]', error);
    return NextResponse.json({ error: String(error.message || error) }, { status: 500 });
  }
}
