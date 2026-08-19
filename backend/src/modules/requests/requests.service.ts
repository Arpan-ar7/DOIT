import { supabaseClient } from '../../config/supabaseClient.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';
import { sendPush } from '../notifications/notifications.service.js';
import type { CreateRequestInput, RequestRecord, RequestStatus } from './requests.types.js';

/**
 * NOTE ON AUTHORIZATION:
 * This service uses the service-role Supabase client, which BYPASSES RLS.
 * That means every ownership/participant check that RLS would normally
 * enforce must be done explicitly in this file's code.
 */

async function getUserCollegeId(userId: string): Promise<string> {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('college_id')
    .eq('id', userId)
    .single();

  if (error || !data?.college_id) {
    throw new AppError(400, 'Could not determine your college — is your profile complete?');
  }

  return data.college_id as string;
}

/**
 * Wraps every notification call so a notification-logging failure can
 * NEVER break the actual request action (accept/cancel/complete) that
 * triggered it. Notifications are a side-effect, not a dependency.
 */
async function notifySafely(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    logger.error({ err }, 'Notification failed (non-blocking)');
  }
}

export async function createRequest(
  requesterId: string,
  payload: CreateRequestInput
): Promise<RequestRecord> {
  const { data, error } = await supabaseClient
    .from('requests')
    .insert({
      requester_id: requesterId,
      item_name: payload.item_name,
      category: payload.category ?? null,
      approximate_price: payload.approximate_price ?? null,
      delivery_fee: payload.delivery_fee,
      images: payload.images,
      notes: payload.notes ?? null,
      pickup_location: payload.pickup_location,
      dropoff_location: payload.dropoff_location,
      needed_by: payload.needed_by ?? null,
    })
    .select()
    .single();

  if (error) {
    logger.error({ err: error }, 'Failed to create request');
    throw new AppError(500, 'Failed to create request');
  }

  return data as RequestRecord;
}

export async function getFeedForUser(userId: string): Promise<RequestRecord[]> {
  const collegeId = await getUserCollegeId(userId);

  const { data, error } = await supabaseClient
    .from('requests')
    .select('*, requester:profiles!requester_id!inner(college_id)')
    .eq('status', 'pending')
    .eq('requester.college_id', collegeId)
    .neq('requester_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ err: error }, 'Failed to fetch feed');
    throw new AppError(500, 'Failed to fetch feed');
  }

  return data as unknown as RequestRecord[];
}

export async function getRequestById(requestId: string): Promise<RequestRecord> {
  const { data, error } = await supabaseClient
    .from('requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (error || !data) {
    throw new AppError(404, 'Request not found');
  }

  return data as RequestRecord;
}

export async function acceptRequest(
  requestId: string,
  delivererId: string
): Promise<RequestRecord> {
  const existing = await getRequestById(requestId);

  if (existing.requester_id === delivererId) {
    throw new AppError(400, 'You cannot accept your own request');
  }

  const { data, error } = await supabaseClient
    .from('requests')
    .update({ status: 'accepted', deliverer_id: delivererId })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select()
    .single();

  if (error || !data) {
    throw new AppError(409, 'This request has already been accepted by someone else');
  }

  const updated = data as RequestRecord;

  // Notify the requester that someone accepted their request.
  await notifySafely(() =>
    sendPush(
      updated.requester_id,
      'request_accepted',
      'Your request was accepted!',
      `Someone is bringing you: ${updated.item_name}`,
      updated.id
    )
  );

  return updated;
}

export async function cancelRequest(
  requestId: string,
  userId: string,
  reason?: string
): Promise<RequestRecord> {
  const existing = await getRequestById(requestId);

  const isParticipant = existing.requester_id === userId || existing.deliverer_id === userId;
  if (!isParticipant) {
    throw new AppError(403, 'You are not a participant in this request');
  }

  if (existing.status === 'completed' || existing.status === 'cancelled') {
    throw new AppError(400, `Cannot cancel a request that is already ${existing.status}`);
  }

  const { data, error } = await supabaseClient
    .from('requests')
    .update({
      status: 'cancelled',
      cancellation_reason: reason ?? null,
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to cancel request');
  }

  const updated = data as RequestRecord;

  // Notify whichever participant DIDN'T do the cancelling.
  const otherPartyId = updated.requester_id === userId ? updated.deliverer_id : updated.requester_id;
  if (otherPartyId) {
    await notifySafely(() =>
      sendPush(
        otherPartyId,
        'request_cancelled',
        'A request was cancelled',
        `"${updated.item_name}" was cancelled${reason ? `: ${reason}` : ''}`,
        updated.id
      )
    );
  }

  return updated;
}

export async function confirmCompletion(
  requestId: string,
  userId: string
): Promise<RequestRecord> {
  const existing = await getRequestById(requestId);

  const isParticipant = existing.requester_id === userId || existing.deliverer_id === userId;
  if (!isParticipant) {
    throw new AppError(403, 'You are not a participant in this request');
  }

  const allowedFromStatuses: RequestStatus[] = ['accepted', 'in_progress'];
  if (!allowedFromStatuses.includes(existing.status)) {
    throw new AppError(400, `Cannot complete a request with status "${existing.status}"`);
  }

  const { data, error } = await supabaseClient
    .from('requests')
    .update({ status: 'completed' })
    .eq('id', requestId)
    .select()
    .single();

  if (error || !data) {
    throw new AppError(500, 'Failed to mark request complete');
  }

  const updated = data as RequestRecord;

  // Notify whichever participant DIDN'T mark it complete.
  const otherPartyId = updated.requester_id === userId ? updated.deliverer_id : updated.requester_id;
  if (otherPartyId) {
    await notifySafely(() =>
      sendPush(
        otherPartyId,
        'item_delivered',
        'Delivery confirmed',
        `"${updated.item_name}" was marked as delivered`,
        updated.id
      )
    );
  }

  return updated;
}

export async function getUserRequests(
  userId: string,
  role: 'requester' | 'deliverer'
): Promise<RequestRecord[]> {
  const column = role === 'requester' ? 'requester_id' : 'deliverer_id';

  const { data, error } = await supabaseClient
    .from('requests')
    .select('*')
    .eq(column, userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ err: error }, 'Failed to fetch user requests');
    throw new AppError(500, 'Failed to fetch your requests');
  }

  return data as RequestRecord[];
}