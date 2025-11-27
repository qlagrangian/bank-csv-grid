// src/hooks/useTags.ts
"use client";

import type { TagNode } from "@/types/tag";
import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  });

export function useTags() {
  const { data, error, isLoading, mutate } = useSWR<TagNode[]>("/api/tags", fetcher);

  async function add(name: string, parentId?: string) {
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId: parentId ?? null })
    });
    if (!res.ok) throw new Error(await res.text());
    await mutate();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/tags?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    await mutate();
  }

  return {
    tree: data ?? [],
    isLoading,
    isError: !!error,
    add,
    remove,
    refresh: () => mutate()
  } as const;
}
