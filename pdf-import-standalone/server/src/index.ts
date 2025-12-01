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

  let bytes: Uint8Array | undefined;
  let mimeType = 'application/pdf';
  if (!isRangeMode && file) {
    bytes = new Uint8Array(await file.arrayBuffer());
    mimeType = file.type || 'application/pdf';
  }

  const userPrompt = isRangeMode
    ? `あなたは財務データ抽出の専門家です。
次の情報が与えられます：(1) 指定された複数の「範囲画像」と、その範囲内のテキスト埋め込み。
各範囲の中に存在する表をCSVとして抽出してください。もし複数の表が同一範囲にある場合はそれぞれを分けて出力してください。
出力は JSON のみで、次の形式で返してください：
{
  "results": [
    { "title": "<表タイトル>", "csv_text": "<CSVテキスト>" }
  ]
}
タイトルが特定できない場合は table_1, table_2 のような汎用キーを使用してください。
数値に含まれるカンマ（例：10,000）はすべて削除し、「10000」として出力してください。
カンマは数値の区切りとしてではなくCSVの区切り文字としてのみ使用してください。
コメントや説明は出力に含めないでください。
${body.prompt ? `\n追加指示:\n${body.prompt}` : ''}`
    : `あなたは財務データ抽出の専門家です。
次の情報が与えられます：(1) 財務諸表を含むPDF、(2) 各ページのテキスト構造を示すtextMap、(3) 対象ページのリスト。
対象ページ内に存在する主要な表題（例：貸借対照表、損益計算書、キャッシュ・フロー計算書など）ごとに、対応する表をCSV形式で抽出してください。
出力は JSON のみで、次の形式で返してください：
{
  "results": [
    { "title": "<表タイトル>", "csv_text": "<CSVテキスト>" }
  ]
}
タイトルが特定できない場合は table_1, table_2 のような汎用キーを使用してください。
数値に含まれるカンマ（例：10,000）はすべて削除し、「10000」として出力してください。
カンマは数値の区切りとしてではなくCSVの区切り文字としてのみ使用してください。
コメントや説明は出力に含めないでください。
${body.prompt ? `\n追加指示:\n${body.prompt}` : ''}`;

  const responseSchema = {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            csv_text: { type: 'string' },
          },
          required: ['title', 'csv_text'],
        },
      },
    },
    required: ['results'],
  } as const;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  const parts: any[] = [{ text: userPrompt }];

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

  type ModelResult = { results: Array<{ title: string; csv_text: string }> };
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

  const map: Record<string, string> = {};
  for (const item of payload.results || []) {
    if (item?.title) map[item.title] = (item.csv_text || '').trim();
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
