// Path: src/types/transaction.ts
import type { BankCode } from './bank';

export interface TransactionRow {
  id: string;
  bank: BankCode;
  date: string;
  description: string;
  credit: number;
  debit: number;
  balance?: number;
  memo?: string;
  // 表示用のタグ（TagAssignmentから構築したパス）。DBカラムには保存しない。
  tag?: string;
  // 未登録行でのローカル保持用に、選択済みのtagId配列（サーバー登録後はAPIで再取得して反映）
  tagIds?: string[];
  isRegistered: boolean;
  /** クライアント側だけで使う「未反映フラグ」 */
  isDirty?: boolean;
}
