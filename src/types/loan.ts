export interface LoanRow {
  id: string;
  bank: string;
  batchName: string;
  amount: number;
  occurrenceYM: string;  // YYYY-MM
  tagId?: string;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoanRequest {
  bank: string;
  batchName: string;
  amount: number;
  occurrenceYM: string;
}

export interface UpdateLoanRequest {
  amount?: number;
  occurrenceYM?: string;
}
