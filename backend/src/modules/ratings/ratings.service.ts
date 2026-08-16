import { supabaseClient } from '../../config/supabaseClient.js';
import { AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';
import type { RatingRecord, SubmitRatingInput } from './ratings.types.js';

/**
 * Submit a rating for the other participant on a request.
 * Gated: the request MUST be 'completed' (i.e. marked delivered) before
 * either side can rate.
 *
 * profiles.average_rating / total_ratings are kept in sync automatically
 * by a DB trigger (trg_ratings_refresh_profile) — nothing to do here for that.
 */
export async function submitRating(
  raterId: string,
  payload: SubmitRatingInput
): Promise<RatingRecord> {
  const { data: request, error: requestError } = await supabaseClient
    .from('requests')
    .select('id, status, requester_id, deliverer_id')
    .eq('id', payload.request_id)
    .single();

  if (requestError || !request) {
    throw new AppError(404, 'Request not found');
  }

  if (request.status !== 'completed') {
    throw new AppError(
      400,
      'You can only rate a request after it has been marked delivered/completed'
    );
  }

  const isRequester = request.requester_id === raterId;
  const isDeliverer = request.deliverer_id === raterId;

  if (!isRequester && !isDeliverer) {
    throw new AppError(403, 'You are not a participant in this request');
  }

  const rateeId = isRequester ? request.deliverer_id : request.requester_id;

  if (!rateeId) {
    throw new AppError(400, 'This request has no counterpart to rate');
  }

  const { data, error } = await supabaseClient
    .from('ratings')
    .insert({
      request_id: payload.request_id,
      rater_id: raterId,
      ratee_id: rateeId,
      score: payload.score,
      review: payload.review ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new AppError(409, 'You have already rated this request');
    }
    logger.error({ err: error }, 'Failed to submit rating');
    throw new AppError(500, 'Failed to submit rating');
  }

  return data as RatingRecord;
}

export async function getRatingsForUser(userId: string): Promise<RatingRecord[]> {
  const { data, error } = await supabaseClient
    .from('ratings')
    .select('*')
    .eq('ratee_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ err: error }, 'Failed to fetch ratings');
    throw new AppError(500, 'Failed to fetch ratings');
  }

  return data as RatingRecord[];
}