// src/components/TagSelectEditor.tsx:1-63
/* eslint-disable react/jsx-no-bind */
"use client";

import { UNASSIGNED_TAG } from "@/constants/tags";
import { useTagTree } from "@/hooks/useTagTree";
import type { TransactionRow } from "@/types/transaction";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RenderEditCellProps } from "react-data-grid";
import { createPortal } from "react-dom";
const EMPTY = UNASSIGNED_TAG;

export default function TagSelectEditor({
  row,
  onRowChange,
  onClose,
}: RenderEditCellProps<TransactionRow>) {
  const { tree } = useTagTree();
  const [levels, setLevels] = useState<string[]>([]); // 中間階層までの選択ID列（葉は含めない）
  const [search, setSearch] = useState("");
  const [pendingIds, setPendingIds] = useState<string[] | null>(null); // 葉を含むフルパス候補
  const pendingLeafId = pendingIds ? pendingIds[pendingIds.length - 1] : null;
  const didInitRef = useRef(false); // 既存タグ初期展開を一度だけ行う

  const currentChildren = useMemo(() => {
    let nodes = tree;
    for (const id of levels) {
      const next = nodes.find((n) => n.id === id);
      if (!next) break;
      nodes = next.children;
    }
    return nodes;
  }, [tree, levels]);

  function resetAndClose() {
    setTimeout(onClose, 0);
  }

  async function handleClear() {
    try {
      if (row.isRegistered) {
        await fetch(`/api/transactions/${row.id}/tags`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagIds: [] }),
        });
        onRowChange(
          { ...row, tag: undefined, isDirty: true, tagIds: [] },
          true
        );
      } else {
        // 未登録行はローカルに保持して登録時にまとめて反映
        onRowChange(
          { ...row, tag: undefined, isDirty: true, tagIds: [] },
          true
        );
      }
    } finally {
      resetAndClose();
    }
  }

  async function commitPending() {
    if (!pendingIds) return;
    const leafId = pendingLeafId!;
    const fullPath = buildPathFromLevels(tree, pendingIds);
    try {
      if (row.isRegistered) {
        await fetch(`/api/transactions/${row.id}/tags`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tagIds: [leafId] }),
        });
      }
      if (row.tag !== fullPath) {
        onRowChange(
          { ...row, tag: fullPath, isDirty: true, tagIds: [leafId] },
          true
        );
      }
    } finally {
      resetAndClose();
    }
  }

  function handlePickAtDepth(id: string, depth: number) {
    // 選択列のdepthより深い部分を切り捨てて進む
    const newPath = [...levels.slice(0, depth), id];
    const node = findNodeByPath(tree, newPath);
    if (!node) return;
    const isLeaf = !node.children || node.children.length === 0;
    if (isLeaf) {
      // 葉は pending に保存し、levels からは除外（直前までの経路を保持）
      setPendingIds(newPath);
      setLevels(newPath.slice(0, newPath.length - 1));
      return;
    }
    setLevels(newPath);
    setPendingIds(null); // 中間ノード選択で pending リセット
  }

  const flatFiltered = useMemo(
    () => searchFilter(flatten(tree), search),
    [tree, search]
  );

  // 現在 levels が指している経路上のノード {id,name} の配列
  const breadcrumb = useMemo(
    () => buildBreadcrumb(tree, levels),
    [tree, levels]
  );

  // 既存行でタグがある場合: パスを初期展開（ルートから葉まで）
  useEffect(() => {
    if (didInitRef.current) return;
    if (!row.tag) return; // 未割当
    // 既にユーザ操作で pending がある場合は上書きしない
    if (pendingIds || levels.length > 0) return;
    const pathNames = row.tag
      .split(">")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!pathNames.length) return;
    const ids = findPathIdsByNames(tree, pathNames);
    if (ids && ids.length) {
      setPendingIds(ids);
      setLevels(ids.slice(0, ids.length - 1));
      didInitRef.current = true;
    }
  }, [tree, row.tag, pendingIds, levels]);

  // ===== Anchoring & dynamic width =====================================
  // セル内に配置する不可視アンカー（span）を計測してポータル側を配置
  const cellAnchorRef = useRef<HTMLSpanElement | null>(null);
  const [anchorRect, setAnchorRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  }>({ top: -9999, left: -9999, width: 0, height: 0 });
  const [panelWidth, setPanelWidth] = useState<number>(420);
  const COL_WIDTH = 180; // 各階層列の幅

  function measure() {
    if (!cellAnchorRef.current) return;
    // 実セル要素を取得 (react-data-grid の gridcell)
    const cellEl = cellAnchorRef.current.closest(
      '[role="gridcell"]'
    ) as HTMLElement | null;
    const rect = (cellEl ?? cellAnchorRef.current).getBoundingClientRect();
    setAnchorRect({
      top: rect.bottom + window.scrollY, // セル下端
      left: rect.left + window.scrollX, // セル左端（右揃え計算に使用）
      width: rect.width,
      height: rect.height,
    });
  }

  useLayoutEffect(() => {
    measure();
  }, []);

  useEffect(() => {
    function onResize() {
      measure();
    }
    function onScroll() {
      measure();
    }
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true); // capture scroll from parents
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, []);

  // 幅は一度広がったら戻らない（最大値を保持）
  useEffect(() => {
    if (typeof window === "undefined") return;
    setPanelWidth((prev) => {
      if (search) {
        const w = 480;
        return w > prev ? w : prev;
      }
      const cols = levels.length + 1; // 表示列数
      const desired = cols * COL_WIDTH + 32; // 余白込み期待幅
      const computed = Math.min(window.innerWidth * 0.9, desired);
      return computed > prev ? computed : prev; // 縮めない
    });
  }, [levels, search]);

  // 画面端からはみ出す場合補正
  const panelPos = useMemo(() => {
    const margin = 4;
    let top = anchorRect.top; // セル下端
    let left = anchorRect.left + anchorRect.width - panelWidth; // 右揃え
    if (typeof window !== "undefined") {
      const vw = window.innerWidth + window.scrollX;
      const vh = window.innerHeight + window.scrollY;
      // 横方向補正
      if (left + panelWidth > vw - margin) left = vw - panelWidth - margin;
      if (left < margin) left = margin;
      // 縦方向（下にはみ出す場合は上側へ）
      const estimatedHeight = 380;
      if (top + estimatedHeight > vh - margin) {
        top = anchorRect.top - estimatedHeight - anchorRect.height; // 上に反転
      }
      if (top < margin) top = margin;
    }
    return { left, top };
  }, [anchorRect, panelWidth]);
  return (
    <>
      {/* セル内に描画されるアンカー */}
      <span ref={cellAnchorRef} className="inline-block w-0 h-0 align-top" />
      {typeof window !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999]"
              onMouseDownCapture={(e) => {
                if (e.target === e.currentTarget) onClose();
              }}
            >
              {/* パネル */}
              {/* eslint-disable-next-line */}
              <div
                // ポータル内の要素。位置はセル計測結果を使ってセット
                className="absolute p-2 bg-white rounded shadow-lg max-h-[420px] border overflow-hidden flex flex-col tag-editor-panel"
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  top: panelPos.top,
                  left: panelPos.left,
                  width: panelWidth,
                }}
              >
                <div className="flex items-start gap-2 mb-2">
                  <input
                    autoFocus
                    className="border rounded px-2 py-1 flex-1 min-w-0"
                    placeholder="検索（名前）"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.stopPropagation();
                        onClose();
                      }
                    }}
                  />
                  <button
                    className="border rounded px-2 flex-shrink-0 whitespace-nowrap"
                    onClick={handleClear}
                  >
                    未割当
                  </button>
                </div>

                {search ? (
                  <div className="max-h-96 overflow-auto pr-1">
                    {flatFiltered.map((n) => (
                      <button
                        key={n.id}
                        className={`w-full text-left px-2 py-1 hover:bg-gray-100 ${
                          pendingLeafId === n.id
                            ? "bg-blue-50 font-semibold"
                            : ""
                        }`}
                        onClick={() => {
                          const pathIds = findPathIdsByLeafId(tree, n.id);
                          if (pathIds) {
                            setPendingIds(pathIds);
                            setLevels(pathIds.slice(0, pathIds.length - 1));
                          }
                        }}
                      >
                        {n.path}
                      </button>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Breadcrumb */}
                    <div className="mb-2 text-xs flex flex-wrap items-center gap-1">
                      <button
                        className={`px-1 py-0.5 rounded border hover:bg-gray-50 ${
                          levels.length === 0 ? "font-semibold bg-gray-100" : ""
                        }`}
                        onClick={() => setLevels([])}
                      >
                        ルート
                      </button>
                      {breadcrumb.map((b, i) => (
                        <div key={b.id} className="flex items-center gap-1">
                          <span className="text-gray-400">{">"}</span>
                          <button
                            className={`px-1 py-0.5 rounded border hover:bg-gray-50 ${
                              i === breadcrumb.length - 1
                                ? "font-semibold bg-gray-100"
                                : ""
                            }`}
                            onClick={() => {
                              // 途中の階層をクリックでその深さまでに戻る
                              setLevels(levels.slice(0, i + 1));
                              setPendingIds(null);
                            }}
                          >
                            {b.name}
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 overflow-auto pr-1 max-h-[320px]">
                      {renderLevel(
                        tree,
                        levels,
                        handlePickAtDepth,
                        COL_WIDTH,
                        pendingLeafId
                      )}
                    </div>
                  </>
                )}
                <div className="flex justify-between mt-2 text-xs gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* {!pendingLeafId ? (
                      <span className="text-gray-400 whitespace-nowrap">
                        葉を選択してください
                      </span>
                    ) : (
                      <span
                        className="text-gray-600 truncate max-w-[240px]"
                        title={buildPathFromLevels(tree, pendingIds!)}
                      >
                        候補: {buildPathFromLevels(tree, pendingIds!)}
                      </span>
                    )} */}
                  </div>
                  <div className="flex gap-2 items-center flex-nowrap">
                    <button
                      className="border rounded px-2 py-1 disabled:opacity-40 whitespace-nowrap flex-shrink-0"
                      disabled={!pendingLeafId}
                      onClick={() => commitPending()}
                    >
                      確定
                    </button>
                    <button
                      onClick={() => onClose?.()}
                      className="text-gray-500 hover:underline px-1 whitespace-nowrap flex-shrink-0"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}

type Node = { id: string; name: string; children: Node[] };

// 現在 levels(選択ID列) に対応する経路上のノード配列を取得
function buildBreadcrumb(
  tree: Node[],
  levels: string[]
): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  let list = tree;
  for (const id of levels) {
    const n = list.find((x) => x.id === id);
    if (!n) break;
    out.push({ id: n.id, name: n.name });
    list = n.children ?? [];
  }
  return out;
}

function renderLevel(
  nodes: Node[],
  levels: string[],
  onPickAtDepth: (id: string, depth: number) => void,
  colWidth = 160,
  pendingLeafId: string | null
): JSX.Element[] {
  const cols: JSX.Element[] = [];
  let colNodes: Node[] = nodes;
  for (let depth = 0; depth <= levels.length; depth++) {
    cols.push(
      <div
        key={depth}
        className="max-h-64 overflow-auto border rounded"
        style={{ width: colWidth }}
      >
        {colNodes.map((n) => (
          <div key={n.id}>
            <button
              className={`w-full text-left px-2 py-1 hover:bg-gray-100 ${
                pendingLeafId === n.id ? "bg-blue-50 font-semibold" : ""
              }`}
              onClick={() => onPickAtDepth(n.id, depth)}
            >
              {n.name}
            </button>
          </div>
        ))}
      </div>
    );
    const sel = levels[depth];
    const next = colNodes.find((n) => n.id === sel);
    if (!next) break;
    colNodes = next.children ?? [];
  }
  return cols;
}

function flatten(
  nodes: Node[],
  prefix: string[] = []
): { id: string; name: string; path: string }[] {
  const out: { id: string; name: string; path: string }[] = [];
  for (const n of nodes) {
    const path = [...prefix, n.name];
    if (!n.children || n.children.length === 0) {
      out.push({ id: n.id, name: n.name, path: path.join(">") });
    }
    out.push(...flatten(n.children ?? [], path));
  }
  return out;
}

function searchFilter(
  items: { id: string; name: string; path: string }[],
  q: string
) {
  const s = q.trim();
  if (!s) return items;
  return items.filter((x) => x.name.includes(s) || x.path.includes(s));
}

function findNodeByPath(nodes: Node[], ids: string[]): Node | undefined {
  let cur: Node | undefined;
  let list = nodes;
  for (const id of ids) {
    cur = list.find((n) => n.id === id);
    if (!cur) return undefined;
    list = cur.children ?? [];
  }
  return cur;
}

// 補助: 選択ID列からフルパス文字列を生成
function buildPathFromLevels(nodes: Node[], ids: string[]): string {
  const names: string[] = [];
  let list = nodes;
  for (const id of ids) {
    const cur = list.find((n) => n.id === id);
    if (!cur) break;
    names.push(cur.name);
    list = cur.children ?? [];
  }
  return names.join(">");
}

// 葉IDからそのフルパス（ID列）を返す。見つからない場合 null。
function findPathIdsByLeafId(
  nodes: Node[],
  leafId: string,
  acc: string[] = []
): string[] | null {
  for (const n of nodes) {
    const nextPath = [...acc, n.id];
    if ((!n.children || n.children.length === 0) && n.id === leafId) {
      return nextPath;
    }
    const res = findPathIdsByLeafId(n.children ?? [], leafId, nextPath);
    if (res) return res;
  }
  return null;
}

// パス名配列 ( [Root, Child, Leaf] ) から ID パスを返す。途中まで一致したらそこまで。
function findPathIdsByNames(
  nodes: Node[],
  names: string[],
  acc: string[] = []
): string[] | null {
  if (!names.length) return acc.length ? acc : null;
  const [head, ...rest] = names;
  const node = nodes.find((n) => n.name === head);
  if (!node) return null;
  const nextAcc = [...acc, node.id];
  if (rest.length === 0) return nextAcc; // 完全一致
  return findPathIdsByNames(node.children ?? [], rest, nextAcc);
}
