import { supabase } from './supabase';
import { apiRequest } from './apiClient';

export type SubmitRatingBody = {
  request_id: string;
  score: number;
  review?: string;
};

export type RatingRow = {
  id: string;
  request_id: string;
  rater_id: string;
  ratee_id: string;
  score: number;
  review?: string | null;
  created_at: string;
};

export function submitRatingApi(body: SubmitRatingBody) {
  return apiRequest<{ id: string }>('/ratings', { method: 'POST', body });
}

export async function getRatingsByRater(raterId?: string): Promise<Record<string, number>> {
  if (!raterId) return {};
  try {
    const { data, error } = await supabase
      .from('ratings')
      .select('request_id, score')
      .eq('rater_id', raterId);

    if (error) {
      console.warn('Error fetching ratings by rater:', error);
      return {};
    }

    const map: Record<string, number> = {};
    (data ?? []).forEach((r) => {
      if (r.request_id && typeof r.score === 'number') {
        map[r.request_id] = r.score;
      }
    });
    return map;
  } catch (err) {
    console.warn('Failed to fetch ratings by rater:', err);
    return {};
  }
}

export async function getRatingsForRequests(
  requestIds: string[],
  raterId?: string
): Promise<Record<string, number>> {
  if (!requestIds || requestIds.length === 0) return {};
  const uniqueIds = [...new Set(requestIds)];
  try {
    let query = supabase
      .from('ratings')
      .select('request_id, score, rater_id')
      .in('request_id', uniqueIds);

    if (raterId) {
      query = query.eq('rater_id', raterId);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Error fetching ratings for requests:', error);
      return {};
    }

    const map: Record<string, number> = {};
    (data ?? []).forEach((r) => {
      if (r.request_id && typeof r.score === 'number') {
        map[r.request_id] = r.score;
      }
    });
    return map;
  } catch (err) {
    console.warn('Failed to fetch ratings for requests:', err);
    return {};
  }
}
