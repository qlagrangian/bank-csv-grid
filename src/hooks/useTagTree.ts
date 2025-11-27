// useTagTree.ts
import useSWR from 'swr';

export type TagNode = {
	id: string;
	name: string;
	active: boolean;
	order: number;
	children: TagNode[];
};

const fetcher = (url: string) => fetch(url).then(res => {
	if (!res.ok) throw new Error(res.statusText);
	return res.json();
});

export function useTagTree() {
	const { data, error, isLoading, mutate } = useSWR<TagNode[]>('/api/tags', fetcher);
	return { tree: data ?? [], isLoading, isError: !!error, mutate };
}
