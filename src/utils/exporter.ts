// src/utils/exporter.ts
import type { BankCode } from '@/types/bank';
import type { TransactionRow } from '@/types/transaction';

/** CSV 生成オプション */
interface CsvOptions {
  /** ヘッダーを完全に上書きしたいとき */
  headers?: string[]
  /** true を渡すと ID / 銀行 列も含める */
  includeMeta?: boolean
}

/**
* 共通 CSV 生成
* - includeMeta が true → id / bank を含める
* - デフォルトは meta を出さない
*/

function buildCsv(
  rows: TransactionRow[],
  headers: string[],
  includeMeta: boolean
): string {

  const body = rows
    .map(r => {
      const main = [
        r.date,
        r.description,
        r.credit,
        r.debit,
        r.balance ?? '',
        r.memo ?? '',
        r.tag ?? ''
      ];
      return includeMeta
        ? [r.id, r.bank, ...main].join(',')
        : main.join(',');
    })
    .join('\n');

  return [headers.join(','), body].join('\n');
}

/** 銀行別 CSV 生成（当面は共通ロジックでカバー） */
export function toCsv(
  bank: BankCode,
  rows: TransactionRow[],
  opts: CsvOptions = {}
): string {
  const baseHeaders = ['取引日', '内容', '入金', '出金', '残高', 'メモ', 'タグ'] as const
  const includeMeta = opts.includeMeta ?? false
  const headers = opts.headers
    ?? (includeMeta ? ['ID', '銀行', ...baseHeaders] : [...baseHeaders]) // ★ スプレッド演算子修正
  // --- 例) PayPay だけ SJIS 出力にしたい場合のフック ----------
  // if (bank === 'paypay') { return encodeSjis(buildCsv(...)) }
  // -------------------------------------------------------------

  return buildCsv(rows, headers, includeMeta)
}
