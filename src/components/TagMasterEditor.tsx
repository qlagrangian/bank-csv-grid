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
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvResult, setCsvResult] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);

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
            onSelect={(id) => {
              setSelected(id);
              // タグ選択時に入力フィールドにフォーカス
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  // ENTERキーで「追加」ボタンにフォーカス移動
                  addButtonRef.current?.focus();
                }
              }}
            />
            <Button
              ref={addButtonRef}
              onClick={handleAddChild}
              disabled={!childName.trim()}
              onKeyDown={(e) => {
                if (e.key === "Enter" && childName.trim()) {
                  e.preventDefault();
                  handleAddChild();
                }
              }}
            >
              追加
            </Button>
          </div>
          <div className="text-xs text-gray-500">※ 既存名と同親で重複不可</div>

          <div className="mt-4 border-t pt-3 space-y-2">
            <div className="font-semibold text-sm">CSVインポート / エクスポート</div>
            <div className="flex gap-2 items-center">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
              />
              <select
                className="border rounded px-2 py-1 text-sm"
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as "merge" | "replace")}
              >
                <option value="merge">merge</option>
                <option value="replace">replace</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                disabled={!csvFile}
                onClick={async () => {
                  if (!csvFile) return;
                  setCsvResult(null);
                  const form = new FormData();
                  form.append("file", csvFile);
                  const qs = new URLSearchParams({ mode: importMode, dryRun: "true" });
                  const resp = await fetch(`/api/tags/import-csv?${qs.toString()}`, {
                    method: "POST",
                    body: form,
                  });
                  const json = await resp.json();
                  if (!resp.ok) {
                    setCsvResult(`error: ${json.error || resp.status}`);
                    return;
                  }
                  setCsvResult(
                    `dry-run: created=${json.created}, updated=${json.updated}, skipped=${json.skipped}, errors=${json.errors?.length ?? 0}, warnings=${json.warnings?.length ?? 0}`
                  );
                }}
              >
                Dry-run
              </Button>
              <Button
                size="sm"
                disabled={!csvFile}
                onClick={async () => {
                  if (!csvFile) return;
                  setCsvResult(null);
                  const form = new FormData();
                  form.append("file", csvFile);
                  const qs = new URLSearchParams({ mode: importMode, dryRun: "false" });
                  const resp = await fetch(`/api/tags/import-csv?${qs.toString()}`, {
                    method: "POST",
                    body: form,
                  });
                  const json = await resp.json();
                  if (!resp.ok) {
                    setCsvResult(`error: ${json.error || resp.status}`);
                    return;
                  }
                  setCsvResult(
                    `applied: created=${json.created}, updated=${json.updated}, skipped=${json.skipped}, errors=${json.errors?.length ?? 0}, warnings=${json.warnings?.length ?? 0}`
                  );
                }}
              >
                Import
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const resp = await fetch("/api/tags/export-csv");
                  const text = await resp.text();
                  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "tags.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export CSV
              </Button>
            </div>
            {csvResult && (
              <div className="text-xs text-gray-700 whitespace-pre-wrap break-all">
                {csvResult}
              </div>
            )}
          </div>
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
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [isEditing]);

  const handleRename = async () => {
    const newName = editName.trim();
    if (!newName || newName === node.name) {
      setIsEditing(false);
      setEditName(node.name);
      return;
    }
    try {
      // TODO: API呼び出しで名称変更を実装する必要があります
      // 現時点では名称変更APIがないため、スキップします
      console.warn("Tag rename API not yet implemented");
      setIsEditing(false);
    } catch (e) {
      console.error("Rename failed:", e);
      setEditName(node.name);
      setIsEditing(false);
    }
  };

  const indentPx = depth * 16; // 16px per level

  return (
    <li>
      <div
        className="flex items-center gap-1 rounded hover:bg-gray-50 border-b border-gray-100"
        style={{ paddingLeft: `${indentPx}px` }}
      >
        {hasChildren ? (
          <button
            className="w-6 h-6 flex items-center justify-center rounded border border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-400 transition-colors text-sm font-semibold"
            onClick={() => onToggle(node.id)}
            aria-label={isOpen ? "折りたたむ" : "展開"}
          >
            {isOpen ? "−" : "+"}
          </button>
        ) : (
          <span className="w-6" />
        )}
        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleRename();
              } else if (e.key === "Escape") {
                setIsEditing(false);
                setEditName(node.name);
              }
            }}
            onBlur={handleRename}
            className="px-1 py-0.5 border rounded text-sm"
          />
        ) : (
          <button
            className={`px-1 py-0.5 rounded ${
              selectedId === node.id ? "bg-blue-100" : ""
            }`}
            onClick={() => onSelect(node.id)}
            onDoubleClick={() => setIsEditing(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSelect(node.id);
              } else if (e.key === "ArrowRight" && hasChildren) {
                e.preventDefault();
                if (!isOpen) onToggle(node.id);
              } else if (e.key === "ArrowLeft" && hasChildren) {
                e.preventDefault();
                if (isOpen) onToggle(node.id);
              }
            }}
            title={node.name}
          >
            {node.name}
          </button>
        )}
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
