// 月次集計レポート API レスポンス型
export interface ReportMonthSlice { debit: number; credit: number; }

export interface ReportNodeMonthly {
	id: string;
	name: string;
	order: number;
	active: boolean;
	debit: number; // 全期間合計
	credit: number; // 全期間合計
	monthly: ReportMonthSlice[]; // months と同じ長さ
	children: ReportNodeMonthly[];
}

export interface ReportResponseMonthly {
	from: string | null;
	to: string | null;
	bank: string | null;
	mode: 'monthly';
	months: string[]; // YYYY-MM
	tree: ReportNodeMonthly[];
}
