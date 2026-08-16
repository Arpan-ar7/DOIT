import { supabaseClient } from '../../config/supabaseClient.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';
import type { MessageRecord } from './messages.types.js';

/**
 * IMPORTANT: this service does NOT broadcast messages to clients.
 * Supabase Realtime listens to Postgres's own replication stream —
 * the moment we INSERT a row below, every client subscribed with a
 * matching filter receives it automatically. Our only job here is
 * to validate the sender is allowed to write to this chat, then insert.
 *
 * These checks mirror the RLS policies (messages_select_participant,
 * messages_insert_participant) exactly — since the service-role client
 * bypasses RLS, we must enforce the same rules here in code.
 */

async function getRequestParticipants(requestId: string) {
  const { data, error } = await supabaseClient
    .from('requests')
    .select('id, status, requester_id, deliverer_id')
    .eq('id', requestId)
    .single();

  if (error || !data) {
    throw new AppError(404, 'Request not found');
  }

  return data;
}

function assertIsParticipant(
  request: { requester_id: string; deliverer_id: string | null },
  userId: string
): void {
  const isParticipant = request.requester_id === userId || request.deliverer_id === userId;
  if (!isParticipant) {
    throw new AppError(403, 'You are not a participant in this request');
  }
}

export async function sendMessage(
  requestId: string,
  senderId: string,
  content: string
): Promise<MessageRecord> {
  const request = await getRequestParticipants(requestId);
  assertIsParticipant(request, senderId);

  if (!['accepted', 'in_progress'].includes(request.status)) {
    throw new AppError(
      400,
      `Cannot send messages on a request with status "${request.status}"`
    );
  }

  const { data, error } = await supabaseClient
    .from('messages')
    .insert({
      request_id: requestId,
      sender_id: senderId,
      content,
    })
    .select()
    .single();

  if (error) {
    logger.error({ err: error }, 'Failed to send message');
    throw new AppError(500, 'Failed to send message');
  }

  return data as MessageRecord;
}

export async function getMessageHistory(
  requestId: string,
  userId: string
): Promise<MessageRecord[]> {
  const request = await getRequestParticipants(requestId);
  assertIsParticipant(request, userId);

  if (request.status === 'completed') {
    throw new AppError(403, 'Chat is no longer available for a completed request');
  }

  const { data, error } = await supabaseClient
    .from('messages')
    .select('*')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error({ err: error }, 'Failed to fetch message history');
    throw new AppError(500, 'Failed to fetch messages');
  }

  return data as MessageRecord[];
}