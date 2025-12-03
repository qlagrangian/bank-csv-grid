"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useTags } from "@/hooks/useTags";
import type { TagNode } from "@/types/tag";
import React, { useEffect, useMemo, useRef, useState } from "react";

/** 内部勘定（タグ）マスタ管理 */
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

  useEffect(() => {
    if (selected === null) {
      inputRef.current?.focus();
    }
  }, [selected]);

  const flat = useMemo(() => flatten(tree), [tree]);
  const selectedNode = selected ? flat.find((n) => n.id === selected) : null;

  async function handleAddChild() {
    const name = childName.trim();
    if (!name) return;
    try {
      await add(name, selected ?? undefined);
      toast({
        title: "追加成功",
        description: `${
          selectedNode ? `「${selectedNode.name}」配下` : "ルート"
        }に「${name}」を追加しました。`,
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
    if (!confirm(`「${name}」を削除しますか？\n※子タグもすべて削除されます。`))
      return;
    try {
      await remove(id);
      toast({ title: "削除成功", description: `「${name}」を削除しました。` });
      if (selected === id) setSelected(null);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "削除失敗",
        description: e.message,
      });
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvFile(e.target.files?.[0] ?? null);
    setCsvResult(null); // ファイルが変わったら結果をクリア
  };

  const handleImport = async (dryRun: boolean) => {
    if (!csvFile) return;
    setCsvResult("処理中...");
    const form = new FormData();
    form.append("file", csvFile);
    const qs = new URLSearchParams({ mode: importMode, dryRun: String(dryRun) });
    try {
      const resp = await fetch(`/api/tags/import-csv?${qs.toString()}`, {
        method: "POST",
        body: form,
      });
      const json = await resp.json();
      if (!resp.ok) {
        throw new Error(json.error || `HTTP ${resp.status}`);
      }
      const resultPrefix = dryRun ? "Dry-run 結果" : "インポート結果";
      setCsvResult(
        `${resultPrefix}:\n- 作成: ${json.created}\n- 更新: ${json.updated}\n- スキップ: ${json.skipped}\n- エラー: ${json.errors?.length ?? 0}\n- 警告: ${json.warnings?.length ?? 0}`
      );
    } catch (e: any) {
      setCsvResult(`エラー: ${e.message}`);
    }
  };
  
  const handleExport = async () => {
    try {
      const resp = await fetch("/api/tags/export-csv");
      if(!resp.ok) throw new Error("エクスポートに失敗しました。")
      const text = await resp.text();
      const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tags_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "エクスポート成功", description: "CSVファイルをダウンロードしました。" })
    } catch(e: any) {
      toast({ variant: "destructive", title: "エクスポート失敗", description: e.message })
    }
  }

  if (isLoading) return <p>Loading...</p>;
  if (isError) return <p className="text-red-600">タグ取得に失敗しました</p>;

  return (
    <Card className="p-4 space-y-4">
      {/* 1. タグツリー表示 */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">タグ管理</h3>
        <div className="flex-1 overflow-auto max-h-[360px] border rounded p-2">
          <div className="flex items-center gap-2 text-sm mb-2">
            <span className="font-semibold">タグツリー</span>
            <Button
              variant={selected === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelected(null)}
              title="ルート直下にタグを追加"
            >
              + ルートに追加
            </Button>
          </div>
          <TagTree
            nodes={tree}
            selectedId={selected}
            onSelect={setSelected}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* 2. アクション (アコーディオン) */}
      <Accordion type="single" collapsible className="w-full" defaultValue="add-tag">
        {/* 2a. 新規タグ追加 */}
        <AccordionItem value="add-tag">
          <AccordionTrigger>
            {selectedNode ? `「${selectedNode.path}」に` : "ルートに"}タグを追加
          </AccordionTrigger>
          <AccordionContent>
            <div className="p-2 space-y-3">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="子タグ名を入力"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if(childName.trim()) handleAddChild();
                    }
                  }}
                />
                <Button
                  ref={addButtonRef}
                  onClick={handleAddChild}
                  disabled={!childName.trim()}
                >
                  追加
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                ※ 既存名と同親での重複はできません
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 2b. CSVインポート/エクスポート */}
        <AccordionItem value="import-export">
          <AccordionTrigger>CSVインポート / エクスポート</AccordionTrigger>
          <AccordionContent>
            <div className="p-2 space-y-6">
              {/* Export */}
              <div className="space-y-2">
                <h4 className="font-semibold text-base">エクスポート</h4>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleExport}
                >
                  現在のタグをCSV形式でダウンロード
                </Button>
              </div>

              <hr />

              {/* Import */}
              <div className="space-y-4">
                <h4 className="font-semibold text-base">インポート</h4>
                <div className="space-y-4">
                  <div className="grid w-full max-w-md items-center gap-2">
                    <Label htmlFor="csv-file">1. CSVファイルを選択</Label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileChange}
                      className="cursor-pointer file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                  </div>

                  <div className="grid w-full max-w-md items-center gap-2">
                    <Label>2. インポートモードを選択</Label>
                    <Select
                      value={importMode}
                      onValueChange={(v) =>
                        setImportMode(v as "merge" | "replace")
                      }
                      disabled={!csvFile}
                    >
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="モード選択" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="merge">
                          Merge: 既存に追記・更新
                        </SelectItem>
                        <SelectItem value="replace">
                          Replace: 全て削除して置換
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid w-full max-w-md items-center gap-2">
                     <Label>3. 実行</Label>
                    <div className="flex gap-2 items-center">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!csvFile}
                        onClick={() => handleImport(true)}
                      >
                        Dry-run (テスト実行)
                      </Button>
                      <Button
                        size="sm"
                        disabled={!csvFile}
                        onClick={() => handleImport(false)}
                      >
                        インポート実行
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {csvResult && (
                <div className="mt-4 text-sm whitespace-pre-wrap break-all border p-3 rounded-md bg-muted/50">
                  <p className="font-semibold mb-2">実行結果:</p>
                  <pre className="text-xs">{csvResult}</pre>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};

// 以下、子コンポーネント (変更なし、ただしTreeNodeのhandleDeleteのconfirmメッセージを修正)
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
  onSelect: (id: string | null) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    // 初期表示時にすべてのノードを展開
    const allIds = new Set<string>();
    const expandAll = (nodes: TagNode[]) => {
      for (const node of nodes) {
        allIds.add(node.id);
        if (node.children) {
          expandAll(node.children);
        }
      }
    };
    expandAll(nodes);
    setExpanded(allIds);
  }, [nodes]);


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
  onSelect: (id: string | null) => void;
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
      console.warn("Tag rename API not yet implemented");
      setIsEditing(false);
    } catch (e) {
      console.error("Rename failed:", e);
      setEditName(node.name);
      setIsEditing(false);
    }
  };

  const indentPx = depth * 16; 

  return (
    <li>
      <div
        className="flex items-center gap-1 rounded hover:bg-muted/50 p-1"
        style={{ paddingLeft: `${indentPx + 4}px` }}
      >
        {hasChildren ? (
          <button
            className="w-6 h-6 flex items-center justify-center rounded border bg-background hover:bg-muted transition-colors text-sm"
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
            aria-label={isOpen ? "折りたたむ" : "展開"}
          >
            {isOpen ? "−" : "+"}
          </button>
        ) : (
          <span className="w-6" />
        )}
        <div
            className={`flex-1 cursor-pointer rounded px-2 py-1 ${
              selectedId === node.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            }`}
            onClick={() => onSelect(node.id)}
            onDoubleClick={() => setIsEditing(true)}
            title={node.name}
          >
            {node.name}
          </div>
        <button
          className="ml-auto text-xs text-destructive/80 hover:underline"
          onClick={(e) => {e.stopPropagation(); onDelete(node.id, node.name);}}
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
