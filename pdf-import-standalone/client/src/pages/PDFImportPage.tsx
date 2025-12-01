import React from 'react';
import CsvExtractor from '../components/CSVExtractor';

const PDFImportPage: React.FC = () => {
  const [file, setFile] = React.useState<File | null>(null);
  const [pdfData, setPdfData] = React.useState<ArrayBuffer | null>(null);
  type ExtractResult = { title: string; csv: string };
  const [results, setResults] = React.useState<ExtractResult[]>([]);

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

      {pdfData ? (
        <>
          <CsvExtractor
            pdf={pdfData}
            file={file}
            onExtracted={(list) => setResults(list)}
          />

          {results.length > 0 && (
            <div className="col-span-12">
              <div className="mt-4 flex flex-col gap-6">
                {results.map((r, i) => {
                  const rows = r.csv
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter((l) => l.length > 0)
                    .map((l) => l.split(','));
                  return (
                    <div key={i} className="border rounded-md bg-white">
                      <div className="px-3 py-2 border-b flex items-center justify-between bg-gray-50">
                        <div className="font-medium text-sm">
                          {r.title || `table_${i + 1}`}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(r.csv);
                              } catch {}
                            }}
                          >
                            コピー
                          </button>
                          <button
                            className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
                            onClick={() => {
                              const blob = new Blob([r.csv], {
                                type: 'text/csv;charset=utf-8;',
                              });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${r.title || `table_${i + 1}`}.csv`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                          >
                            CSVダウンロード
                          </button>
                        </div>
                      </div>
                      <div className="overflow-auto">
                        <table className="min-w-full text-sm">
                          <tbody>
                            {rows.map((cols, ri) => (
                              <tr
                                key={ri}
                                className={ri === 0 ? 'bg-gray-50' : ''}
                              >
                                {cols.map((c, ci) => (
                                  <td key={ci} className="px-2 py-1 border">
                                    {c}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
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
