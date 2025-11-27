"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useTags } from "@/hooks/useTags";
import type { TagNode } from "@/types/tag";
import React, { useEffect, useMemo, useRef, useState } from "react";

/** 内部勘定（タグ）マスタ管理：ツリー + 子追加（カスケード流用） */
export const TagMasterEditor: React.FC = () => {
  const { tree, isLoading, isError, add, remove } = useTags();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [childName, setChildName] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ルートを明示的に選択解除した時にも入力へフォーカス
  useEffect(() => {
    inputRef.current?.focus();
  }, [selected]);

  const flat = useMemo(() => flatten(tree), [tree]);
  const selectedNode = selected ? flat.find((n) => n.id === selected) : null;

  async function handleAddChild() {
    const name = childName.trim();
    if (!name) return;
    try {
      await add(name, selected ?? undefined);
      toast({
        title: "追加",
        description: `${
          selectedNode ? selectedNode.name + " 配下" : "ルート"
        } に "${name}" を追加`,
      });
      setChildName("");
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "追加失敗",
        description: e.message,
      });
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" を削除しますか？`)) return;
    try {
      await remove(id);
      toast({ title: "削除", description: `"${name}" を削除しました` });
      if (selected === id) setSelected(null);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "削除失敗",
        description: e.message,
      });
    }
  }

  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p className="text-red-600">タグ取得に失敗しました</p>;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start gap-4">
        {/* 左: ツリー（折り畳み付き） */}
        <div className="flex-1 overflow-auto max-h-[360px] border rounded p-2 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">タグツリー</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelected(null); // ルートを選択状態に相当
                setTimeout(() => inputRef.current?.focus(), 0);
              }}
              title="ルート直下にタグを追加"
            >
              + ルートに追加
            </Button>
            {selectedNode && (
              <button
                className="ml-auto text-xs text-blue-600 hover:underline"
                onClick={() => {
                  setSelected(null);
                  setTimeout(() => inputRef.current?.focus(), 0);
                }}
              >
                ルートへ追加に切替
              </button>
            )}
          </div>
          <TagTree
            nodes={tree}
            selectedId={selected}
            onSelect={(id) => setSelected(id)}
            onDelete={handleDelete}
          />
        </div>

        {/* 右: 子追加（選択したノード直下） */}
        <div className="w-[320px] space-y-2">
          <div className="text-sm text-gray-600">
            追加先: {selectedNode ? selectedNode.path : "ルート"}
          </div>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="子タグ名を入力して Enter"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddChild()}
            />
            <Button onClick={handleAddChild} disabled={!childName.trim()}>
              追加
            </Button>
          </div>
          <div className="text-xs text-gray-500">※ 既存名と同親で重複不可</div>
        </div>
      </div>
    </Card>
  );
};

type Flat = { id: string; name: string; path: string };
function flatten(nodes: TagNode[], prefix: string[] = []): Flat[] {
  const out: Flat[] = [];
  for (const n of nodes) {
    const path = [...prefix, n.name];
    out.push({ id: n.id, name: n.name, path: path.join(" > ") });
    out.push(...flatten(n.children ?? [], path));
  }
  return out;
}

function TagTree({
  nodes,
  selectedId,
  onSelect,
  onDelete,
}: {
  nodes: TagNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  }

  return (
    <ul className="space-y-1">
      {nodes.map((n) => (
        <TreeNode
          key={n.id}
          node={n}
          depth={0}
          expanded={expanded}
          onToggle={toggle}
          selectedId={selectedId}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  selectedId,
  onSelect,
  onDelete,
}: {
  node: TagNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const hasChildren = (node.children?.length ?? 0) > 0;
  const isOpen = expanded.has(node.id);
  return (
    <li>
      <div
        className={`flex items-center gap-1 pl-${
          Math.min(depth, 8) * 4
        } rounded hover:bg-gray-50`}
      >
        {hasChildren ? (
          <button
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-100"
            onClick={() => onToggle(node.id)}
            aria-label={isOpen ? "折りたたむ" : "展開"}
          >
            {isOpen ? "-" : "+"}
          </button>
        ) : (
          <span className="w-5" />
        )}
        <button
          className={`px-1 py-0.5 rounded ${
            selectedId === node.id ? "bg-blue-100" : ""
          }`}
          onClick={() => onSelect(node.id)}
          title={node.name}
        >
          {node.name}
        </button>
        <button
          className="ml-auto text-xs text-red-600 hover:underline"
          onClick={() => onDelete(node.id, node.name)}
        >
          削除
        </button>
      </div>
      {isOpen && hasChildren && (
        <ul className="space-y-1 mt-1">
          {node.children.map((c) => (
            <TreeNode
              key={c.id}
              node={c}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedId={selectedId}
              onSelect={onSelect}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
