import { z } from 'zod';

export const transactionTypeEnum = z.enum([
  'item_cost',
  'delivery_fee',
  'refund',
  'wallet_topup',
]);
export type TransactionType = z.infer<typeof transactionTypeEnum>;

export const paymentMethodEnum = z.enum(['cash', 'upi', 'wallet', 'other']);

export const createTransactionSchema = z.object({
  request_id: z.string().uuid(),
  type: transactionTypeEnum,
  amount: z.number().positive(),
  method: paymentMethodEnum.default('cash'),
});
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export interface TransactionRecord {
  id: string;
  request_id: string;
  payer_id: string;
  payee_id: string;
  type: TransactionType;
  amount: number;
  method: string;
  status: 'pending' | 'confirmed' | 'disputed' | 'cancelled';
  confirmed_by_payer: boolean;
  confirmed_by_payee: boolean;
  created_at: string;
  updated_at: string;
}