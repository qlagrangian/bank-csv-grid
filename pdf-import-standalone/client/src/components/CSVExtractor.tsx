import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { getTextMap } from '../utils/extractPDFTextMap';
import Annotator from 'react-pdf-ner-annotator';
import 'react-pdf-ner-annotator/css/style.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';
const BANK_OPTIONS = [
  { value: 'gmo', label: 'GMOあおぞら銀行' },
  { value: 'sbi', label: 'SBI銀行' },
  { value: 'paypay', label: 'PayPay銀行' },
  { value: 'mizuhoebiz', label: 'みずほe-ビジネスサイト' },
  { value: 'mizuhobizweb', label: 'みずほビジネスWEB' },
] as const;
type StatementType = 'transfer' | 'card';

type ExtractResult = { title: string; csv: string };

interface PdfExtractorProps {
  pdf: ArrayBuffer;
  file: File | null;
  setExtractedCSV?: (csvs: string[]) => void;
  onExtracted?: (results: Array<ExtractResult>) => void;
}

const CsvExtractor: React.FC<PdfExtractorProps> = ({
  pdf,
  file,
  setExtractedCSV,
  onExtracted,
}) => {
  // ------- Types for range selection (local minimal copies) -------
  type Rectangle = { left: number; top: number; width: number; height: number };
  type PDFMeta = { width: number; height: number; scale: number };
  type AreaAnnotation = {
    boundingBox: Rectangle;
    pdfInformation: PDFMeta;
    base64Image?: string;
    text?: string;
  };
  type Annotation = {
    id: number;
    page: number;
    areaAnnotation?: AreaAnnotation;
    entity?: {
      id: number;
      name: string;
      color: string;
      entityType: 'NER' | 'AREA';
    };
  };
  type TextLayerItem = { coords: Rectangle; text: string };
  type TextLayer = { page: number; textMapItems: TextLayerItem[] };

  const [pagesCount, setPagesCount] = useState<number>(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // Results display is handled by parent
  const annotatorContainerRef = useRef<HTMLDivElement | null>(null);
  const annotatorRef = useRef<any>(null);

  const [mode, setMode] = useState<'page' | 'range'>('page');
  const [statementType, setStatementType] = useState<StatementType>('transfer');
  const [bank, setBank] = useState<string>('');

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [textMaps, setTextMaps] = useState<TextLayer[]>([]);
  const areaSelections = useMemo(
    () => annotations.filter((a) => !!a.areaAnnotation),
    [annotations]
  );

  const [previewImg, setPreviewImg] = useState<string | null>(null);

  // Delegated click handler to toggle page selection when clicking a rendered PDF page
  const handleAnnotatorClick = useCallback(
    (e: React.MouseEvent) => {
      if (mode !== 'page') return; // only active in page mode
      const root = annotatorContainerRef.current;
      if (!root) return;
      const target = e.target as HTMLElement;
      const pageEl = target.closest('.page') as HTMLElement | null;
      if (!pageEl) return;
      const pageNodes = Array.from(
        root.querySelectorAll('.page')
      ) as HTMLElement[];
      const index = pageNodes.findIndex((n) => n === pageEl);
      if (index >= 0) {
        const pageNum = index + 1; // 1-based
        setSelectedPages((prev) =>
          prev.includes(pageNum)
            ? prev.filter((p) => p !== pageNum)
            : [...prev, pageNum].sort((a, b) => a - b)
        );
      }
    },
    [mode]
  );

  // Add/Remove CSS highlight to selected pages
  useEffect(() => {
    const root = annotatorContainerRef.current;
    if (!root) return;
    const pageNodes = Array.from(
      root.querySelectorAll('.page')
    ) as HTMLElement[];
    pageNodes.forEach((el, idx) => {
      const pageNum = idx + 1;
      if (selectedPages.includes(pageNum)) {
        el.classList.add('csvex-selected');
      } else {
        el.classList.remove('csvex-selected');
      }
    });
  }, [selectedPages, pagesCount]);

  const allPages = useMemo(
    () => Array.from({ length: pagesCount }, (_, i) => i + 1),
    [pagesCount]
  );

  const parsePagesInput = useCallback(
    (value: string): number[] => {
      const nums = new Set<number>();
      for (const part of value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)) {
        if (/^\d+$/.test(part)) {
          const n = parseInt(part, 10);
          if (n > 0 && n <= pagesCount) nums.add(n);
        } else if (/^(\d+)-(\d+)$/.test(part)) {
          const [, a, b] = part.match(/^(\d+)-(\d+)$/)!;
          const start = Math.min(parseInt(a, 10), parseInt(b, 10));
          const end = Math.max(parseInt(a, 10), parseInt(b, 10));
          for (let i = start; i <= end; i++) {
            if (i > 0 && i <= pagesCount) nums.add(i);
          }
        }
      }
      return Array.from(nums).sort((a, b) => a - b);
    },
    [pagesCount]
  );

  const handleExtract = useCallback(async () => {
    if (mode === 'page' && !file) {
      setError('PDFファイルが未選択です');
      return;
    }
    if (!bank) {
      setError('銀行を選択してください');
      return;
    }
    setError(null);
    setLoading(true);

    const doPageMode = async () => {
      if (!selectedPages.length) {
        throw new Error('抽出対象ページを選択してください');
      }
      // Build textMap for selected pages
      const texts = await getTextMap(pdf, selectedPages);
      const textMap = {
        pages: Object.fromEntries(
          selectedPages.map((p, i) => [String(p), texts[i] ?? ''])
        ),
      } as const;
      const fd = new FormData();
      fd.append('file', file as File);
      fd.append('mode', 'page');
      fd.append('pages', JSON.stringify(selectedPages));
      fd.append('textMap', JSON.stringify(textMap));
      fd.append('statementType', statementType);
      fd.append('bank', bank);
      const resp = await fetch(`${API_BASE}/api/extract-csv`, {
        method: 'POST',
        body: fd,
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`サーバーエラー (${resp.status}): ${t}`);
      }
      const data = (await resp.json()) as { results: Record<string, string> };
      return Object.entries(data.results || {}).map(([title, csv]) => ({
        title,
        csv: csv || '',
      }));
    };

    const rectIntersects = (a: Rectangle, b: Rectangle) => {
      const ax2 = a.left + a.width;
      const ay2 = a.top + a.height;
      const bx2 = b.left + b.width;
      const by2 = b.top + b.height;
      const xOverlap = Math.max(
        0,
        Math.min(ax2, bx2) - Math.max(a.left, b.left)
      );
      const yOverlap = Math.max(0, Math.min(ay2, by2) - Math.max(a.top, b.top));
      return xOverlap > 0 && yOverlap > 0;
    };

    const getCurrentPageViewport = (
      pageNum: number
    ): { width: number; height: number } | null => {
      const root = annotatorContainerRef.current;
      if (!root) return null;
      const pages = Array.from(root.querySelectorAll('.page')) as HTMLElement[];
      const pageEl = pages[pageNum - 1];
      if (!pageEl) return null;
      const container = pageEl.querySelector(
        '.page__container'
      ) as HTMLElement | null;
      if (!container) return null;
      return { width: container.offsetWidth, height: container.offsetHeight };
    };

    const scaleRect = (rect: Rectangle, factor: number): Rectangle => ({
      left: rect.left * factor,
      top: rect.top * factor,
      width: rect.width * factor,
      height: rect.height * factor,
    });

    const expandRect = (rect: Rectangle, pad: number): Rectangle => ({
      left: Math.max(0, rect.left - pad),
      top: Math.max(0, rect.top - pad),
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
    });

    const doRangeMode = async () => {
      const ranges = areaSelections
        .map((a) => ({
          id: a.id,
          page: a.page,
          image: a.areaAnnotation?.base64Image || null,
          bbox: a.areaAnnotation?.boundingBox || null,
          pdf: a.areaAnnotation?.pdfInformation || null,
        }))
        .filter((r) => r.bbox && r.page) as Array<{
        id: number;
        page: number;
        image: string | null;
        bbox: Rectangle;
        pdf: PDFMeta | null;
      }>;

      if (!ranges.length) {
        throw new Error('範囲が選択されていません');
      }

      // For each range, collect text tokens inside bbox from textMaps
      const perRange = ranges.map((r) => {
        const tl = textMaps.find((t) => t.page === r.page);
        const curr = getCurrentPageViewport(r.page);
        const factor = curr && r.pdf?.width ? curr.width / r.pdf.width : 1;
        const paddedBBox = expandRect(r.bbox, 2);

        const items = (tl?.textMapItems || []).filter((it) => {
          const tokenRect =
            factor !== 1 ? scaleRect(it.coords, 1 / factor) : it.coords;
          return rectIntersects(paddedBBox, tokenRect);
        });
        const sorted = items.sort((a, b) =>
          a.coords.top === b.coords.top
            ? a.coords.left - b.coords.left
            : a.coords.top - b.coords.top
        );
        const joined = sorted.map((i) => i.text).join(' ');
        return {
          page: r.page,
          image: r.image, // base64
          bbox: r.bbox,
          pdf: r.pdf,
          text: joined,
        };
      });

      const fd = new FormData();
      fd.append('mode', 'range');
      fd.append('ranges', JSON.stringify(perRange));
      fd.append('statementType', statementType);
      fd.append('bank', bank);

      const resp = await fetch(`${API_BASE}/api/extract-csv`, {
        method: 'POST',
        body: fd,
      });
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`サーバーエラー (${resp.status}): ${t}`);
      }
      const data = (await resp.json()) as { results: Record<string, string> };
      return Object.entries(data.results || {}).map(([title, csv]) => ({
        title,
        csv: csv || '',
      }));
    };

    try {
      const list: ExtractResult[] =
        mode === 'page' ? await doPageMode() : await doRangeMode();
      if (setExtractedCSV) setExtractedCSV(list.map((r) => r.csv));
      if (typeof onExtracted === 'function') onExtracted(list);
    } catch (e: any) {
      setError(e?.message || '抽出に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [
    file,
    selectedPages,
    pdf,
    setExtractedCSV,
    onExtracted,
    mode,
    areaSelections,
    textMaps,
    statementType,
    bank,
  ]);

  const handleOnLoadSuccess = useCallback(
    (count: number) => {
      setPagesCount(count);
      if (!selectedPages.length && count > 0) {
        setSelectedPages([1]);
      }
    },
    [selectedPages.length]
  );

  const [pagesInput, setPagesInput] = useState<string>('');
  useEffect(() => {
    setPagesInput(selectedPages.join(','));
  }, [selectedPages]);

  const onPagesInputApply = useCallback(() => {
    setSelectedPages(parsePagesInput(pagesInput));
  }, [pagesInput, parsePagesInput]);

  const clearSelection = useCallback(() => setSelectedPages([]), []);
  const selectAll = useCallback(() => setSelectedPages(allPages), [allPages]);

  const HighlightStyle = (
    <style>{`
      .csvex-selected .page__container {
        outline: 3px solid #3b82f6;
        outline-offset: 0px;
      }
    `}</style>
  );

  const TABLE_REGION_ENTITY = useMemo(
    () => ({
      id: 999,
      name: '範囲選択',
      color: '#f59e0b',
      entityType: 'AREA' as const,
    }),
    []
  );

  return (
    <div className="w-full grid grid-cols-12 gap-4">
      {HighlightStyle}
      {/* Viewer + results */}
      <div className="col-span-9">
        <div
          ref={annotatorContainerRef}
          onClick={handleAnnotatorClick}
          className="border rounded-md overflow-auto max-h-[90vh] bg-white"
        >
          <Annotator
            data={pdf}
            onLoadSuccess={handleOnLoadSuccess}
            getAnnotations={setAnnotations as any}
            getTextMaps={setTextMaps as any}
            ref={annotatorRef}
            entity={mode === 'range' ? (TABLE_REGION_ENTITY as any) : undefined}
          />
        </div>

        <div className="mt-4">
          {loading && <div className="text-sm text-gray-600">抽出中…</div>}
          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>
      </div>

      {/* Sidebar */}
      <div className="col-span-3">
        <div className="sticky top-4 border rounded-md p-3 flex flex-col gap-3 bg-white">
          <div className="font-medium">明細タイプ</div>
          <div className="flex gap-2">
            <button
              className={`text-xs px-2 py-1 border rounded ${statementType === 'transfer' ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}
              onClick={() => setStatementType('transfer')}
            >
              総合振込明細
            </button>
            <button
              className={`text-xs px-2 py-1 border rounded ${statementType === 'card' ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}
              onClick={() => setStatementType('card')}
            >
              カード利用明細
            </button>
          </div>

          <div>
            <div className="font-medium">銀行</div>
            <select
              className="w-full border rounded px-2 py-1 text-sm mt-1"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
            >
              <option value="">選択してください</option>
              {BANK_OPTIONS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div className="font-medium">抽出モード</div>
          <div className="flex gap-2">
            <button
              className={`text-xs px-2 py-1 border rounded ${mode === 'page' ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}
              onClick={() => setMode('page')}
            >
              ページ選択
            </button>
            <button
              className={`text-xs px-2 py-1 border rounded ${mode === 'range' ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}
              onClick={() => setMode('range')}
            >
              範囲選択
            </button>
          </div>

          {mode === 'page' && (
            <>
              <div className="font-medium mt-1">ページ選択</div>
              <div className="text-xs text-gray-600">
                右のリスト、入力、またはビューワのページをクリックして選択できます。
              </div>

              <div className="flex gap-2">
                <button
                  className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                  onClick={selectAll}
                  disabled={!pagesCount}
                >
                  すべて
                </button>
                <button
                  className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                  onClick={clearSelection}
                  disabled={!selectedPages.length}
                >
                  クリア
                </button>
              </div>

              <div>
                <label className="block text-xs text-gray-700 mb-1">
                  入力 (例: 1,3-5,8)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={pagesInput}
                    onChange={(e) => setPagesInput(e.target.value)}
                    placeholder="1,3-5"
                  />
                  <button
                    className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                    onClick={onPagesInputApply}
                  >
                    反映
                  </button>
                </div>
              </div>

              <div className="max-h-[40vh] overflow-auto border rounded">
                {allPages.length ? (
                  <ul className="divide-y">
                    {allPages.map((p) => (
                      <li key={p} className="flex items-center gap-2 px-2 py-1">
                        <input
                          id={`page-${p}`}
                          type="checkbox"
                          className="cursor-pointer"
                          checked={selectedPages.includes(p)}
                          onChange={(e) =>
                            setSelectedPages((prev) =>
                              e.target.checked
                                ? [...prev, p].sort((a, b) => a - b)
                                : prev.filter((n) => n !== p)
                            )
                          }
                        />
                        <label
                          htmlFor={`page-${p}`}
                          className="text-sm cursor-pointer"
                        >
                          ページ {p}
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-gray-500 p-2">
                    ページ情報なし
                  </div>
                )}
              </div>
            </>
          )}

          {mode === 'range' && (
            <>
              <div className="font-medium mt-1">範囲選択</div>
              <div className="text-xs text-gray-600">
                PDF上でドラッグして範囲を作成できます。選択した範囲は下にスタック表示されます。
              </div>
              <div className="max-h-[40vh] overflow-auto border rounded p-2 flex flex-col gap-2">
                {areaSelections.length ? (
                  areaSelections.map((a) => {
                    const src = a.areaAnnotation?.base64Image || '';
                    return (
                      <div key={a.id} className="flex items-center gap-2">
                        <img
                          src={src}
                          className="w-16 h-16 object-contain border rounded cursor-pointer bg-white"
                          alt="選択範囲のサムネイル"
                          onClick={() => setPreviewImg(src)}
                        />
                        <div className="text-xs flex-1">
                          p.{a.page} / id:{a.id}
                        </div>
                        <button
                          className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                          onClick={() =>
                            annotatorRef.current?.removeAnnotation?.(a.id)
                          }
                        >
                          ×
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-gray-500">
                    選択中の範囲はありません
                  </div>
                )}
              </div>
              {previewImg && (
                <div
                  className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                  onClick={() => setPreviewImg(null)}
                >
                  <div
                    className="bg-white p-3 rounded shadow max-w-[80vw] max-h-[80vh]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={previewImg}
                      alt="範囲プレビュー"
                      className="max-w-[78vw] max-h-[70vh] object-contain"
                    />
                    <div className="mt-2 text-right">
                      <button
                        className="text-xs px-2 py-1 border rounded hover:bg-gray-50"
                        onClick={() => setPreviewImg(null)}
                      >
                        閉じる
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <button
            className="mt-2 w-full px-3 py-2 rounded-md bg-blue-600 text-white text-sm disabled:bg-gray-300"
            onClick={handleExtract}
            disabled={
              (mode === 'page'
                ? !selectedPages.length
                : !areaSelections.length) ||
              !file ||
              !bank ||
              loading
            }
          >
            {loading ? '抽出中…' : 'テーブル抽出を実行'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CsvExtractor;
