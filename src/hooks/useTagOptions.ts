// useTagOptions.ts
import { UNASSIGNED_TAG } from '@/constants/tags';
import { useTags } from '@/hooks/useTags';

export function useTagOptions() {
  const { tree = [] } = useTags();

  // Flatten tree to get all tags
  const flattenTags = (nodes: any[]): any[] => {
    return nodes.flatMap(node => [node, ...flattenTags(node.children || [])]);
  };

  const allTags = flattenTags(tree);

  return [
    { value: UNASSIGNED_TAG, label: '（未割当）' },
    ...allTags.map(t => ({ value: t.name, label: t.name })),
  ];
}
