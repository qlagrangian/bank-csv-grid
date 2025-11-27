// File: src/types/tag.ts

// 内部勘定マスタ（Tag）型定義
export interface Tag {
  id: string;
  name: string;
  createdAt: string; // ISO8601
  updatedAt: string; // ISO8601
}

// ツリー表現用ノード型
export type TagNode = {
  id: string;
  name: string;
  order: number;
  active: boolean;
  children: TagNode[];
};
