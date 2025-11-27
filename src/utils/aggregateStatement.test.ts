import { aggregateStatement, formatStatement, type TxInput } from "./aggregateStatement";

describe("aggregateStatement", () => {
  const yen = (n: number) => `${n}円`;

  it("タグ付きは (タグ×出金/入金) で合算し、タグなしは合算せず末尾に原順で並べる", () => {
    const txs: TxInput[] = [
      { tag: "人件費", debit: 10000 },
      { tag: "社会保険", debit: 20000 },
      { tag: "利益A", credit: 30000 },
      { tag: "人件費", credit: 10000 },
      { tag: "人件費", debit: 10000 },
      { tag: "notag", credit: 1000 },
      { tag: "", credit: 2000 },
    ];

    const lines = aggregateStatement(txs);
    expect(lines).toEqual([
      { tag: "人件費", side: "出金", amount: 20000, aggregated: true },
      { tag: "人件費", side: "入金", amount: 10000, aggregated: true },
      { tag: "社会保険", side: "出金", amount: 20000, aggregated: true },
      { tag: "利益A", side: "入金", amount: 30000, aggregated: true },
      { tag: "notag", side: "入金", amount: 1000, aggregated: false, index: 5 },
      { tag: "",      side: "入金", amount: 2000, aggregated: false, index: 6 },
    ]);

    expect(formatStatement(lines)).toEqual([
      `人件費, 出金, ${yen(20000)}`,
      `人件費, 入金, ${yen(10000)}`,
      `社会保険, 出金, ${yen(20000)}`,
      `利益A, 入金, ${yen(30000)}`,
      `notag, 入金, ${yen(1000)}`,
      `, 入金, ${yen(2000)}`,
    ]);
  });

  it("同一タグ内は『出金→入金』の順で表示する", () => {
    const txs: TxInput[] = [
      { tag: "A", credit: 500 },
      { tag: "A", debit: 300 },
    ];
    const lines = aggregateStatement(txs);
    expect(lines.map(l => `${l.tag}-${l.side}-${l.amount}`)).toEqual([
      "A-出金-300",
      "A-入金-500",
    ]);
  });

  it("同一 (タグ×側) は金額を正しく加算する", () => {
    const txs: TxInput[] = [
      { tag: "A", debit: 100 },
      { tag: "A", debit: 200 },
      { tag: "A", credit: 50 },
      { tag: "A", credit: 70 },
    ];
    const lines = aggregateStatement(txs);
    expect(lines).toEqual([
      { tag: "A", side: "出金", amount: 300, aggregated: true },
      { tag: "A", side: "入金", amount: 120, aggregated: true },
    ]);
  });

  it("タグのグルーピング順は初出順（安定）を保つ", () => {
    const txs: TxInput[] = [
      { tag: "C", debit: 1 },
      { tag: "A", debit: 1 },
      { tag: "B", debit: 1 },
      { tag: "A", credit: 1 },
      { tag: "C", credit: 1 },
    ];
    const lines = aggregateStatement(txs);
    expect(lines.map(l => l.tag)).toEqual(["C", "C", "A", "A", "B"]);
  });

  it("タグなし（null/undefined/'notag'/空文字）は『集計対象外』として原順で末尾に並べる", () => {
    const txs: TxInput[] = [
      { tag: undefined, credit: 10 },
      { tag: null,      debit: 20 },
      { tag: "notag",   credit: 30 },
      { tag: "",        debit: 40 },
    ];
    const lines = aggregateStatement(txs);
    expect(lines).toEqual([
      { tag: undefined, side: "入金", amount: 10, aggregated: false, index: 0 },
      { tag: null,      side: "出金", amount: 20, aggregated: false, index: 1 },
      { tag: "notag",   side: "入金", amount: 30, aggregated: false, index: 2 },
      { tag: "",        side: "出金", amount: 40, aggregated: false, index: 3 },
    ]);
  });

  it("0や未指定金額は無視し、両側金額があれば双方に加算する", () => {
    const txs: TxInput[] = [
      { tag: "X", debit: 0, credit: 0 },
      { tag: "X", debit: undefined, credit: 100 },
      { tag: "X", debit: 200, credit: undefined },
      { tag: "X", debit: 3, credit: 4 },
    ];
    const lines = aggregateStatement(txs);
    expect(lines).toEqual([
      { tag: "X", side: "出金", amount: 203, aggregated: true },
      { tag: "X", side: "入金", amount: 104, aggregated: true },
    ]);
  });
});

