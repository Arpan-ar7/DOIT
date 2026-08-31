import { supabaseClient } from '../../config/supabaseClient.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { sendPush } from '../notifications/notifications.service.js';
import type { MessageRecord } from './messages.types.js';

async function notifySafely(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    logger.error({ err }, 'Notification failed (non-blocking)');
  }
}

const CHAT_BUFFER_MS = 10 * 60 * 1000; // 10 minutes buffer after delivery

async function getRequestParticipants(requestId: string) {
  const { data, error } = await supabaseClient
    .from('requests')
    .select('id, status, requester_id, deliverer_id, item_name, completed_at, updated_at')
    .eq('id', requestId)
    .single();

  if (error || !data) {
    throw new AppError(404, 'Request not found');
  }

  return data as {
    id: string;
    status: string;
    requester_id: string;
    deliverer_id: string | null;
    item_name: string;
    completed_at?: string | null;
    updated_at?: string | null;
  };
}

function isChatOpen(request: { status: string; completed_at?: string | null; updated_at?: string | null }): boolean {
  if (['accepted', 'in_progress'].includes(request.status)) {
    return true;
  }
  if (request.status === 'completed') {
    const completionTimeStr = request.completed_at || request.updated_at;
    if (!completionTimeStr) return false;
    const completedMs = new Date(completionTimeStr).getTime();
    if (isNaN(completedMs)) return false;
    return Date.now() - completedMs < CHAT_BUFFER_MS;
  }
  return false;
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

function isImageUrl(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    (t.startsWith('http://') || t.startsWith('https://')) &&
    (t.includes('/storage/') || t.includes('profilepic') || /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(t))
  );
}

export async function sendMessage(
  requestId: string,
  senderId: string,
  content: string
): Promise<MessageRecord> {
  const request = await getRequestParticipants(requestId);
  assertIsParticipant(request, senderId);

  if (!isChatOpen(request)) {
    if (request.status === 'completed') {
      throw new AppError(400, 'Chat is closed. The 10-minute window after delivery has expired.');
    }
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

  const message = data as MessageRecord;

  // Notify whichever participant DIDN'T send this message.
  const recipientId =
    request.requester_id === senderId ? request.deliverer_id : request.requester_id;

  if (recipientId) {
    const { data: senderProfile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', senderId)
      .single();

    const isImage = isImageUrl(content);
    const senderName = senderProfile?.full_name?.trim() || 'Someone';

    const notificationTitle = isImage
      ? `📷 Photo for "${request.item_name}"`
      : request.item_name
      ? `${senderName} (${request.item_name})`
      : `New message from ${senderName}`;

    const notificationBody = isImage
      ? `${senderName} sent a photo for order "${request.item_name}". Tap to view.`
      : content.length > 100
      ? content.slice(0, 100) + '...'
      : content;

    await notifySafely(() =>
      sendPush(
        recipientId,
        'new_message',
        notificationTitle,
        notificationBody,
        requestId
      )
    );
  }

  return message;
}

export async function getMessageHistory(
  requestId: string,
  userId: string
): Promise<MessageRecord[]> {
  const request = await getRequestParticipants(requestId);
  assertIsParticipant(request, userId);

  if (request.status === 'completed' && !isChatOpen(request)) {
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