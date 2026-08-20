import { apiRequest } from './apiClient';
import { RequestCategory } from '../constants/mockData';

// Raw shape returned by the backend — matches the `requests` table columns
// exactly (snake_case). NOT the same shape our screens use — mapApiRequest()
// in RequestsContext.tsx translates between the two.
export type ApiRequestRow = {
  id: string;
  item_name: string;
  category: string | null;
  approximate_price: number | null;
  delivery_fee: number;
  notes: string | null;
  pickup_location: string;
  dropoff_location: string;
  expires_at: string;
  requester_id: string;
  deliverer_id: string | null;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'expired';
  created_at: string;
  updated_at: string;
};

export type CreateRequestBody = {
  item_name: string;
  category?: RequestCategory;
  approximate_price?: number;
  delivery_fee?: number;
  notes?: string;
  pickup_location: string;
  dropoff_location: string;
};

export function createRequestApi(body: CreateRequestBody) {
  return apiRequest<ApiRequestRow>('/requests', { method: 'POST', body });
}

// Everyone ELSE's pending requests — backend already excludes your own.
export function getOpenFeed() {
  return apiRequest<ApiRequestRow[]>('/requests');
}

// Your own requests, either as poster ('requester') or as the person
// delivering someone else's ('deliverer') — needed so Order Status can
// find requests you've accepted.
export function getMyRequests(role: 'requester' | 'deliverer') {
  return apiRequest<ApiRequestRow[]>(`/requests/mine?role=${role}`);
}

export function acceptRequestApi(id: string) {
  return apiRequest<ApiRequestRow>(`/requests/${id}/accept`, { method: 'POST' });
}

export function cancelRequestApi(id: string, reason?: string) {
  return apiRequest<ApiRequestRow>(`/requests/${id}/cancel`, {
    method: 'POST',
    body: reason ? { reason } : undefined,
  });
}

// NOTE — no accepted -> in_progress endpoint exists. This jumps straight
// to completed. See gap #1 above.
export function completeRequestApi(id: string) {
  return apiRequest<ApiRequestRow>(`/requests/${id}/confirm-complete`, { method: 'POST' });
}

export type SubmitRatingBody = { request_id: string; score: number; review?: string };

export function submitRatingApi(body: SubmitRatingBody) {
  return apiRequest<{ id: string }>('/ratings', { method: 'POST', body });
}