import { GoogleGenerativeAI } from '@google/generative-ai';
import { serve } from '@hono/node-server';
import { Hono, Context } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const logger = {
  log: (...args: any[]) => console.log('[server]', ...args),
  error: (...args: any[]) => console.error('[server]', ...args),
};

const app = new Hono();

app.use(
  '/*',
  cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use('*', async (c, next) => {
  logger.log(`[${c.req.method}] ${c.req.path}`);
  await next();
});

app.get('/', (c) => c.text('PDF Import / CSV Extractor API'));

app.post('/api/extract-csv', async (c: Context) => {
  const form = await c.req.formData();
  const file = form.get('file') as File | null;

  const MODEL_NAME = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

  const BodySchema = z
    .object({
      prompt: z.string().optional().default(''),
      statementType: z.enum(['transfer', 'card']).default('transfer'),
      bank: z
        .string()
        .optional()
        .transform((s) => (s ?? '').trim())
        .refine((s) => s.length > 0, 'bank is required'),
      mode: z.string().optional().default('page'),
      pages: z
        .string()
        .optional()
        .transform((s) => {
          if (s === undefined) return undefined;
          try {
            return JSON.parse(s) as number[];
          } catch {
            throw new Error('pages must be a JSON array string');
          }
        }),
      textMap: z
        .string()
        .optional()
        .transform((s) => {
          if (s === undefined) return undefined;
          try {
            return JSON.parse(s) as unknown;
          } catch {
            throw new Error('textMap must be a JSON string');
          }
        }),
      ranges: z
        .string()
        .optional()
        .transform((s) => {
          if (s === undefined) return undefined;
          try {
            return JSON.parse(s) as Array<any>;
          } catch {
            throw new Error('ranges must be a JSON array string');
          }
        }),
    })
    .superRefine((val, ctx) => {
      const mode = (val.mode || 'page').toLowerCase();
      if (mode === 'page') {
        if (
          !Array.isArray(val.pages) ||
          !val.pages.every((n: any) => Number.isInteger(n) && n > 0)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['pages'],
            message:
              'pages must be a JSON array of 1-based integers (required in page mode)',
          });
        }
        if (typeof val.textMap === 'undefined') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['textMap'],
            message: 'textMap is required in page mode',
          });
        }
      } else if (mode === 'range') {
        if (!Array.isArray(val.ranges) || val.ranges.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['ranges'],
            message: 'ranges must be a non-empty JSON array in range mode',
          });
        }
      }
    });

  const nonFile = Object.fromEntries(
    [...form].filter(([k]) => k !== 'file')
  ) as Record<string, string>;

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(nonFile);
  } catch (err: any) {
    throw new HTTPException(400, {
      message: 'Invalid request body: ' + err.message,
    });
  }

  const isRangeMode = (body.mode || 'page') === 'range';

  if (!isRangeMode && !file) {
    throw new HTTPException(400, { message: 'Missing PDF file' });
  }

  const statementType = body.statementType;
  const bank = body.bank;
  const isTransferStatement = statementType === 'transfer';
  const memoLabel = isTransferStatement ? '総合振込明細' : 'カード利用明細';

  let bytes: Uint8Array | undefined;
  let mimeType = 'application/pdf';
  if (!isRangeMode && file) {
    bytes = new Uint8Array(await file.arrayBuffer());
    mimeType = file.type || 'application/pdf';
  }

  const typeSpecific = isTransferStatement
    ? `- description は「受取人名・銀行・支店・科目・口座番号」を結合した文字列にすること。
- withdrawal は「振込金額」または「支払金額」に記載の数値を使用し、同一行に複数数値がある場合は最初に出現する数値を採用すること。
- memo は必ず「${memoLabel}」とすること。`
    : `- description は「ご利用店名・ご利用先・摘要」を結合した文字列にすること。
- withdrawal は必ず「支払金額」欄の数値を使用し、「利用金額」ではなく支払金額を採用すること。
- memo は必ず「${memoLabel}」とすること。`;

  const userPrompt = `あなたは財務データ抽出の専門家です。
表が含まれるPDF情報（${isRangeMode ? '範囲画像と範囲内テキスト' : 'PDFとtextMap'}）から、以下の出力スキーマに従ってJSONを返してください。
出力は JSON のみで、次の形式で返してください：
{
  "results": [
    {
      "title": "<表タイトル>",
      "rows": [
        { "date": "<取引日>", "description": "<内容>", "deposit": 0, "withdrawal": 1234, "balance": "<残高もしくは空>", "memo": "${memoLabel}" }
      ]
    }
  ]
}
- title が特定できない場合は table_1, table_2 のような汎用キーを使用すること。
- deposit は常に 0 とすること。withdrawal は通貨記号・円・カンマ・ハイフンを除いた純粋な数値にすること。
- balance が無い場合は空文字とすること。description/memo は文字列。
- コメントや説明は出力に含めないこと。
${typeSpecific}
${body.prompt ? `追加指示:\n${body.prompt}` : ''}`;

  const responseSchema = {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            rows: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  description: { type: 'string' },
                  deposit: { type: 'number' },
                  withdrawal: { type: 'number' },
                  balance: { type: 'string' },
                  memo: { type: 'string' },
                },
                required: ['description', 'withdrawal', 'memo'],
              },
            },
          },
          required: ['title', 'rows'],
        },
      },
    },
    required: ['results'],
  } as const;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const parts: any[] = [
    { text: userPrompt },
    { text: `抽出タイプ: ${statementType}\n銀行: ${bank}` },
  ];

  if (!isRangeMode && bytes) {
    parts.unshift({
      inlineData: { data: Buffer.from(bytes).toString('base64'), mimeType },
    });
    parts.push(
      { text: `対象ページ (1始まり): ${JSON.stringify(body.pages)}` },
      { text: `textMap (JSON):\n${JSON.stringify(body.textMap)}` }
    );
  }

  const contents: any[] = [{ role: 'user', parts }];

  if (isRangeMode) {
    const ranges = (body as any).ranges as Array<{
      page: number;
      image?: string | null;
      bbox?: { left: number; top: number; width: number; height: number };
      pdf?: { width: number; height: number; scale: number } | null;
      text?: string;
    }> | undefined;

    if (!ranges || !Array.isArray(ranges) || ranges.length === 0) {
      throw new HTTPException(400, { message: 'ranges が空です' });
    }

    for (let i = 0; i < ranges.length; i++) {
      const r = ranges[i];
      const metaText = [
        `範囲 #${i + 1} 情報:`,
        `- ページ: ${r.page}`,
        `- bbox: ${JSON.stringify(r.bbox || {})}`,
        r.pdf ? `- pdfInfo: ${JSON.stringify(r.pdf)}` : '',
        r.text ? `- textInRange: ${r.text}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      if (r.image && typeof r.image === 'string' && r.image.startsWith('data:')) {
        const match = r.image.match(/^data:(.*?);base64,(.*)$/);
        if (match) {
          const imgMime = match[1];
          const imgB64 = match[2];
          contents[0].parts.push({
            inlineData: { data: imgB64, mimeType: imgMime },
          });
        }
      }
      contents[0].parts.push({ text: metaText });
    }
  }

  const result = await model.generateContent({
    contents,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: responseSchema as any,
    },
  });

  const respText = result.response.text();

  type ModelResult = {
    results: Array<{
      title: string;
      rows: Array<{
        date?: string;
        description: string;
        deposit?: number;
        withdrawal: number;
        balance?: string;
        memo?: string;
      }>;
    }>;
  };
  let payload: ModelResult;
  try {
    payload = JSON.parse(respText);
  } catch {
    const match = respText.match(/\{[\s\S]*\}/);
    if (!match)
      throw new HTTPException(500, {
        message: 'Failed to parse model response as JSON',
      });
    payload = JSON.parse(match[0]) as ModelResult;
  }

  const escapeCsv = (value: string) => {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const normalizeNumberString = (value: any) => {
    if (typeof value === 'number') return String(Math.trunc(value));
    if (typeof value === 'string') {
      const cleaned = value.replace(/[^\d]/g, '');
      return cleaned;
    }
    return '';
  };

  const header = '取引日,内容,入金,出金,残高,メモ,銀行';
  const map: Record<string, string> = {};
  for (const item of payload.results || []) {
    if (!item?.title) continue;
    const rows = item.rows || [];
    const csvRows = rows.map((r) => {
      const date = (r.date ?? '').toString().trim();
      const description = (r.description ?? '').toString().trim();
      const withdrawal = normalizeNumberString(r.withdrawal) || '0';
      const balance = (r.balance ?? '').toString().trim();
      const memo = (r.memo ?? memoLabel).toString().trim() || memoLabel;
      const line = [
        date,
        description,
        '0',
        withdrawal,
        balance,
        memo,
        bank,
      ].map((v) => escapeCsv(v));
      return line.join(',');
    });
    map[item.title] = [header, ...csvRows].join('\n').trim();
  }

  return c.json({
    results: map,
    model: MODEL_NAME,
    tokens: {
      input: result.response.usageMetadata?.promptTokenCount ?? 0,
      output: result.response.usageMetadata?.candidatesTokenCount ?? 0,
    },
  });
});

const port = Number(process.env.PORT || 3001);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    logger.log(`Server is running on http://localhost:${info.port}`);
  }
);
