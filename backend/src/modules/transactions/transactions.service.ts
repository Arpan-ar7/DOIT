import { supabaseClient } from '../../config/supabaseClient.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';
import type { CreateTransactionInput, TransactionRecord } from './transactions.types.js';

/**
 * NOTE: This is a confirmation LOG, not a real payment processor.
 * MVP is cash/UPI settled directly between users on campus — this table
 * just records that an exchange happened and lets both sides confirm it.
 *
 * payer/payee are always derived from the request itself
 * (requester pays, deliverer receives) — never taken from client input.
 */
export async function createTransaction(
  userId: string,
  payload: CreateTransactionInput
): Promise<TransactionRecord> {
  const { data: request, error: requestError } = await supabaseClient
    .from('requests')
    .select('id, requester_id, deliverer_id, status')
    .eq('id', payload.request_id)
    .single();

  if (requestError || !request) {
    throw new AppError(404, 'Request not found');
  }

  const isParticipant = request.requester_id === userId || request.deliverer_id === userId;
  if (!isParticipant) {
    throw new AppError(403, 'You are not a participant in this request');
  }

  if (!request.deliverer_id) {
    throw new AppError(400, 'This request has no deliverer assigned yet');
  }

  const { data, error } = await supabaseClient
    .from('transactions')
    .insert({
      request_id: payload.request_id,
      payer_id: request.requester_id,
      payee_id: request.deliverer_id,
      type: payload.type,
      amount: payload.amount,
      method: payload.method,
    })
    .select()
    .single();

  if (error) {
    logger.error({ err: error }, 'Failed to create transaction');
    throw new AppError(500, 'Failed to log transaction');
  }

  return data as TransactionRecord;
}

/**
 * Either side confirms the exchange happened. Once both payer and payee
 * have confirmed, status flips to 'confirmed'.
 */
export async function confirmTransaction(
  transactionId: string,
  userId: string
): Promise<TransactionRecord> {
  const { data: existing, error: fetchError } = await supabaseClient
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (fetchError || !existing) {
    throw new AppError(404, 'Transaction not found');
  }

  const isPayer = existing.payer_id === userId;
  const isPayee = existing.payee_id === userId;

  if (!isPayer && !isPayee) {
    throw new AppError(403, 'You are not a participant in this transaction');
  }

  const updates: Record<string, unknown> = {};
  if (isPayer) updates.confirmed_by_payer = true;
  if (isPayee) updates.confirmed_by_payee = true;

  const willBeFullyConfirmed =
    (isPayer || existing.confirmed_by_payer) && (isPayee || existing.confirmed_by_payee);

  if (willBeFullyConfirmed) {
    updates.status = 'confirmed';
  }

  const { data, error } = await supabaseClient
    .from('transactions')
    .update(updates)
    .eq('id', transactionId)
    .select()
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to confirm transaction');
  }

  return data as TransactionRecord;
}

export async function getTransactionsForRequest(
  requestId: string,
  userId: string
): Promise<TransactionRecord[]> {
  const { data, error } = await supabaseClient
    .from('transactions')
    .select('*')
    .eq('request_id', requestId)
    .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ err: error }, 'Failed to fetch transactions for request');
    throw new AppError(500, 'Failed to fetch transactions');
  }

  return data as TransactionRecord[];
}

export async function getMyTransactions(userId: string): Promise<TransactionRecord[]> {
  const { data, error } = await supabaseClient
    .from('transactions')
    .select('*')
    .or(`payer_id.eq.${userId},payee_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ err: error }, 'Failed to fetch transactions');
    throw new AppError(500, 'Failed to fetch your transactions');
  }

  return data as TransactionRecord[];
}