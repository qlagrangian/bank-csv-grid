// src/utils/columns.tsx:1-68
"use client";
import TagSelectEditor from "@/components/TagSelectEditor";
import type { TransactionRow } from "@/types/transaction";
import type {
  Column,
  RenderCellProps,
  RenderEditCellProps,
} from "react-data-grid";

/* ------- セルフォーマッタ ------------ */
export function TagCellFormatter({ row }: RenderCellProps<TransactionRow>) {
  const assigned = !!row.tag;
  const label = assigned ? row.tag! : "未割当";
  const title = assigned ? row.tag! : "(未割当)";
  const style = assigned
    ? row.isRegistered && !row.isDirty
      ? "bg-green-100 text-green-800"
      : "bg-yellow-100 text-yellow-800"
    : "bg-gray-200 text-gray-500";
  return (
    <div
      className={`px-1 rounded text-xs truncate ${style}`}
      title={title}
      data-unassigned={assigned ? undefined : "true"}
    >
      {label}
    </div>
  );
}

export type GridKey = keyof TransactionRow;
const JP_NAME: Record<GridKey, string> = {
  id: "ID",
  bank: "銀行",
  date: "取引日",
  description: "内容",
  credit: "入金",
  debit: "出金",
  balance: "残高",
  memo: "メモ",
  tag: "タグ",
  tagIds: "タグID", // UIには通常出さない
  isRegistered: "登録済み",
  isDirty: "未反映",
  isLinkedChild: "PDF子行",
  isDeactivated: "非活性",
} as const;

// narrow helper
function narrow<K extends GridKey>(k: K): K {
  return k;
}

export function buildColumns(
  keys: GridKey[],
  allowEditRegistered = false
): Column<TransactionRow>[] {
  return keys
    .filter(
      (k): k is GridKey =>
        k !== "isDirty" && k !== "tagIds" && k !== "isLinkedChild" && k !== "isDeactivated"
    ) // UI に出さない
    .map((key) => {
      if (key === "tag") {
        return {
          key: narrow("tag"),
          name: JP_NAME.tag,
          width: 160,
          minWidth: 120,
          resizable: true,
          draggable: true,
          // 末尾に広がりやすくする
          cellClass: "rdg-tag-cell",
          // タグ編集はDeactivate行のみ不可。子行は編集可能。
          editable: (row) => !row.isDeactivated,
          renderEditCell: (p: RenderEditCellProps<TransactionRow>) => (
            <TagSelectEditor {...p} />
          ),
          renderCell: TagCellFormatter,
        } satisfies Column<TransactionRow>;
      }

      return {
        key: narrow(key),
        name: JP_NAME[key],
        resizable: false,
        width: 110,
      } satisfies Column<TransactionRow>;
    });
}
