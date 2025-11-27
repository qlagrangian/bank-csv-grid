/** Integer Yen value. */
export type Money = number;

/** Transaction side. */
export type Side = "出金" | "入金";

/**
 * Input transaction row.
 * - 出金(debit) / 入金(credit) are positive-only. 0, null, undefined are ignored.
 */
export type TxInput = {
  tag?: string | null;
  debit?: Money | null;
  credit?: Money | null;
};

/**
 * A line of the statement after aggregation.
 * - aggregated=true: totals per (tag × side)
 * - aggregated=false: passthrough of tagless rows, preserving original order via index
 */
export type StatementLine = {
  tag: string | null | undefined;
  side: Side;
  amount: Money; // non-negative integer yen
  aggregated: boolean;
  index?: number; // present only when aggregated=false
};

export type AggregateOptions = {
  /** Detect tagless rows. Default treats null/undefined/""/"notag" (case-insensitive, trimmed) as tagless. */
  isTagless?: (tag: string | null | undefined) => boolean;
  /** Whether to drop zero-amount lines after aggregation. Default true. */
  dropZero?: boolean;
};

/**
 * Normalize a tag for grouping. Currently trims surrounding spaces.
 * Note: This is only for grouping keys; display uses first-seen trimmed tag.
 */
function normalizeForKey(tag: string): string {
  return tag.trim();
}

/** Default tagless detector: null/undefined/empty/"notag" (case-insensitive, trimmed). */
function defaultIsTagless(tag: string | null | undefined): boolean {
  if (tag == null) return true;
  const t = tag.trim();
  if (t.length === 0) return true;
  return t.toLowerCase() === "notag";
}

/** Ensure amount is a positive integer; otherwise returns 0. */
function normalizeAmount(n: Money | null | undefined): Money {
  return typeof n === "number" && n > 0 ? Math.trunc(n) : 0;
}

type Totals = { displayTag: string; debit: Money; credit: Money };

/**
 * Aggregate transactions into statement lines.
 * - Tagged rows: aggregate by (tag × side), groups appear in first-seen tag order.
 * - Tagless rows: passthrough (not aggregated) and appended at the end in original order.
 * - Within a tag group: 出金 then 入金 (only if amount > 0).
 * - O(n) using Map to maintain insertion order.
 */
export function aggregateStatement(
  txs: TxInput[],
  options?: AggregateOptions
): StatementLine[] {
  const isTagless = options?.isTagless ?? defaultIsTagless;
  const dropZero = options?.dropZero ?? true;

  const groups = new Map<string, Totals>();
  const taglessLines: StatementLine[] = [];

  txs.forEach((tx, index) => {
    const debit = normalizeAmount(tx.debit);
    const credit = normalizeAmount(tx.credit);

    // skip rows with no positive amounts entirely
    if (debit === 0 && credit === 0) {
      return;
    }

    const tag = tx.tag;
    if (isTagless(tag)) {
      // passthrough in original order; for a single row with both sides, output 出金 then 入金
      if (debit > 0) {
        taglessLines.push({ tag, side: "出金", amount: debit, aggregated: false, index });
      }
      if (credit > 0) {
        taglessLines.push({ tag, side: "入金", amount: credit, aggregated: false, index });
      }
      return;
    }

    const displayTag = (typeof tag === "string" ? tag.trim() : "");
    const key = normalizeForKey(displayTag);
    const g = groups.get(key) ?? { displayTag, debit: 0, credit: 0 };
    g.debit += debit;
    g.credit += credit;
    if (!groups.has(key)) groups.set(key, g);
  });

  const lines: StatementLine[] = [];
  for (const { displayTag, debit, credit } of groups.values()) {
    if (!dropZero || debit > 0) {
      if (debit > 0 || !dropZero) {
        lines.push({ tag: displayTag, side: "出金", amount: debit, aggregated: true });
      }
    }
    if (!dropZero || credit > 0) {
      if (credit > 0 || !dropZero) {
        lines.push({ tag: displayTag, side: "入金", amount: credit, aggregated: true });
      }
    }
  }

  // Append tagless rows preserving original order (already pushed in traversal order)
  lines.push(...taglessLines);
  return lines;
}

/** Strings for UI. Keep formatting separate & configurable. */
export type FormatOptions = {
  /** currency suffix (default "円") */
  currencySuffix?: string;
  /** group digits with commas? default false (tests expect no commas) */
  groupDigits?: boolean;
  /** how to render tagless label; default: raw -> empty for null/undefined, otherwise original string */
  taglessLabel?: (tag: string | null | undefined) => string;
};

function defaultTaglessLabel(tag: string | null | undefined): string {
  if (tag == null) return "";
  return tag;
}

function formatAmount(n: Money, groupDigits: boolean): string {
  if (!groupDigits) return String(n);
  return n.toLocaleString("ja-JP");
}

/**
 * Format statement lines into display strings: `${tag}, ${side}, ${amount}${suffix}`
 * - Does not hardcode tagless handling; configurable via options.taglessLabel
 */
export function formatStatement(
  lines: StatementLine[],
  options?: FormatOptions
): string[] {
  const suffix = options?.currencySuffix ?? "円";
  const groupDigits = options?.groupDigits ?? false;
  const taglessLabel = options?.taglessLabel ?? defaultTaglessLabel;

  return lines.map(({ tag, side, amount }) => {
    const label =
      tag == null || defaultIsTagless(tag)
        ? taglessLabel(tag)
        : typeof tag === "string"
          ? tag
          : "";
    const amt = formatAmount(amount, groupDigits);
    return `${label}, ${side}, ${amt}${suffix}`;
  });
}

/**
 * Optional adapter placeholder to map existing TransactionRow to TxInput.
 * Kept internal to avoid coupling if the type is not available here.
 */
export function toTxInput(row: {
  tag?: string | null;
  debit?: Money | null;
  credit?: Money | null;
}): TxInput {
  return {
    tag: row.tag ?? null,
    debit: row.debit ?? null,
    credit: row.credit ?? null,
  };
}

