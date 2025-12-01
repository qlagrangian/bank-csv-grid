import React from 'react';
import CsvExtractor from '../components/CSVExtractor';

type LinkedRow = {
  id: string;
  bank: string;
  date: string;
  description: string;
  credit: number;
  debit: number;
  balance?: number | null;
  memo?: string | null;
};

const PDFImportPage: React.FC = () => {
  const [file, setFile] = React.useState<File | null>(null);
  const [pdfData, setPdfData] = React.useState<ArrayBuffer | null>(null);
  type ExtractResult = { title: string; csv: string };
  const [results, setResults] = React.useState<
    Array<ExtractResult & { rows: LinkedRow[] }>
  >([]);
  const [linkedRows, setLinkedRows] = React.useState<LinkedRow[]>([]);
  const [linking, setLinking] = React.useState(false);
  const [linkMessage, setLinkMessage] = React.useState<string | null>(null);

  const [parentId, setParentId] = React.useState<string>('');
  const [parentBank, setParentBank] = React.useState<string>('');
  const [parentDate, setParentDate] = React.useState<string>('');

  const LINK_API_BASE =
    import.meta.env.VITE_LINK_API_BASE || 'http://localhost:3000';

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    const pid = sp.get('parentId') || '';
    const pbank = sp.get('bank') || '';
    const pdate = sp.get('date') || '';
    setParentId(pid);
    setParentBank(pbank);
    setParentDate(pdate);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      const buf = await f.arrayBuffer();
      setPdfData(buf);
    } else {
      setPdfData(null);
    }
  };

  const parseNumber = (v: string) => {
    const cleaned = v.replace(/[^\d.-]/g, '');
    if (!cleaned) return 0;
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : 0;
  };

  const parseCsvToRows = (csv: string): LinkedRow[] => {
    const lines = csv
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return [];
    const body = lines.slice(1); // skip header
    return body
      .map((line) => line.replace(/^"|"$/g, ''))
      .map((line) => {
        const cols = line
          .split(',')
          .map((c) => c.replace(/^"|"$/g, '').trim());
        const [
          _date,
          description,
          credit,
          debit,
          balance,
          memo,
          _bank,
        ] = cols;
        return {
          id: '',
          bank: parentBank || _bank || '',
          date: parentDate || _date || '',
          description: description || '',
          credit: parseNumber(credit || '0'),
          debit: parseNumber(debit || '0'),
          balance: balance ? parseNumber(balance) : null,
          memo: memo || '',
        };
      });
  };

  return (
    <div className="p-4 flex flex-col gap-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">PDFから財務テーブル抽出</h1>
        <div>
          <label className="inline-flex items-center gap-3 px-4 py-2 rounded-md border cursor-pointer hover:bg-gray-50 bg-white">
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            <span className="text-sm">PDFをアップロード</span>
          </label>
        </div>
      </div>

      {(parentId || parentBank || parentDate) && (
        <div className="text-sm text-gray-700 flex gap-4">
          <div>親ID: {parentId || '-'}</div>
          <div>銀行: {parentBank || '-'}</div>
          <div>取引日: {parentDate || '-'}</div>
        </div>
      )}

      {pdfData ? (
        <>
          <CsvExtractor
            pdf={pdfData}
            file={file}
            initialBank={parentBank}
            lockBank={!!parentBank}
            onExtracted={(list) => {
              let seq = 0;
              const mapped = list.map((item) => {
                const rows = parseCsvToRows(item.csv);
                const withIds = rows.map((r) => ({
                  ...r,
                  id: `${parentId || 'tmp'}-${String(++seq).padStart(3, '0')}`,
                }));
                return { ...item, rows: withIds };
              });
              const flattened = mapped.flatMap((m) => m.rows);
              setResults(mapped);
              setLinkedRows(flattened);
              setLinkMessage(null);
            }}
          />

          {results.length > 0 && (
            <div className="col-span-12">
              <div className="mt-4 flex flex-col gap-6">
                {results.map((r, i) => (
                  <div key={i} className="border rounded-md bg-white">
                    <div className="px-3 py-2 border-b flex items-center justify-between bg-gray-50">
                      <div className="font-medium text-sm">
                        {r.title || `table_${i + 1}`}
                      </div>
                    </div>
                    <div className="overflow-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-1 border text-left">ID</th>
                            <th className="px-2 py-1 border text-left">
                              取引日
                            </th>
                            <th className="px-2 py-1 border text-left">
                              内容
                            </th>
                            <th className="px-2 py-1 border text-right">
                              入金
                            </th>
                            <th className="px-2 py-1 border text-right">
                              出金
                            </th>
                            <th className="px-2 py-1 border text-right">
                              残高
                            </th>
                            <th className="px-2 py-1 border text-left">メモ</th>
                            <th className="px-2 py-1 border text-left">
                              銀行
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.rows.map((row, ri) => (
                            <tr key={ri}>
                              <td className="px-2 py-1 border">{row.id}</td>
                              <td className="px-2 py-1 border">{row.date}</td>
                              <td className="px-2 py-1 border">
                                {row.description}
                              </td>
                              <td className="px-2 py-1 border text-right">
                                {row.credit}
                              </td>
                              <td className="px-2 py-1 border text-right">
                                {row.debit}
                              </td>
                              <td className="px-2 py-1 border text-right">
                                {row.balance ?? ''}
                              </td>
                              <td className="px-2 py-1 border">{row.memo}</td>
                              <td className="px-2 py-1 border">{row.bank}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm disabled:bg-gray-300"
                  disabled={
                    linking ||
                    !parentId ||
                    !parentBank ||
                    !parentDate ||
                    !linkedRows.length
                  }
                  onClick={async () => {
                    if (
                      !parentId ||
                      !parentBank ||
                      !parentDate ||
                      !linkedRows.length
                    )
                      return;
                    setLinking(true);
                    setLinkMessage(null);
                    try {
                      const resp = await fetch(
                        `${LINK_API_BASE}/api/transactions/link-pdf`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            parentId,
                            parentBank,
                            parentDate,
                            rows: linkedRows,
                          }),
                        }
                      );
                      if (!resp.ok) {
                        const t = await resp.text();
                        throw new Error(
                          `紐付けに失敗しました (${resp.status}): ${t}`
                        );
                      }
                      setLinkMessage('紐付けを反映しました。');
                    } catch (e: any) {
                      setLinkMessage(e?.message || '紐付けに失敗しました');
                    } finally {
                      setLinking(false);
                    }
                  }}
                >
                  {linking ? '紐付け中…' : '紐付け実行'}
                </button>
                {linkMessage && (
                  <div className="text-sm text-gray-700">{linkMessage}</div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-sm text-gray-600">
          PDFファイルをアップロードすると、右側でページ選択し、抽出できます。
        </div>
      )}
    </div>
  );
};

export default PDFImportPage;
