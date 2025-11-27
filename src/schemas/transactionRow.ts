// src/schemas/transactionRow.ts
import { z } from 'zod';

export const TransactionRowSchema = z.object({
  id: z.string(),
  bank: z.string(),
  date: z.string(),
  description: z.string(),
  credit: z.number(),
  debit: z.number(),
  balance: z.number().optional(),
  memo: z.string().optional(),
  tag: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  isRegistered: z.boolean(),
});

export type TransactionRow = z.infer<typeof TransactionRowSchema>;
