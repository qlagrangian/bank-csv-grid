import { NextResponse } from 'next/server';
import { exportTagsToCsv } from '@/utils/tagCsv';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const csv = await exportTagsToCsv();
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="tags.csv"',
      },
    });
  } catch (error: any) {
    console.error('[API /tags/export-csv]', error);
    return NextResponse.json({ error: String(error.message || error) }, { status: 500 });
  }
}
