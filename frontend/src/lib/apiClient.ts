import { supabase } from './supabase';
import { API_BASE_URL } from '../constants/api';

// ─── Types (match the backend's response shapes) ───────────────────────────

export type RequestStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export interface DeliveryRequest {
  id: string;
  item_name: string;
  category?: string;
  approximate_price?: number;
  delivery_fee?: number;
  images?: string[];
  notes?: string;
  pickup_location: string;
  dropoff_location: string;
  needed_by?: string;
  status: RequestStatus;
  requester_id: string;
  deliverer_id?: string;
  [key: string]: any; // backend may return extra columns we don't model yet
}

export interface Rating {
  id: string;
  request_id: string;
  score: number; // 1-5
  review?: string;
}

export type ReportType = 'bug' | 'complaint' | 'query' | 'user_report' | 'payment_issue' | 'other';

export interface Report {
  id: string;
  type: ReportType;
  subject: string;
  description: string;
  request_id?: string;
  reported_user_id?: string;
}

export type TransactionType = 'item_cost' | 'delivery_fee' | 'refund' | 'wallet_topup';

export interface Transaction {
  id: string;
  request_id: string;
  type: TransactionType;
  amount: number;
  method: string;
  status: 'pending' | 'confirmed';
}

export interface ChatMessage {
  id: string;
  request_id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

// ─── Core request helper ────────────────────────────────────────────────────

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeader = await getAuthHeader();

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...options.headers,
      },
    });
  } catch (err) {
    // Network-level failure — wrong IP, server not running, no internet, etc.
    throw new ApiError(
      'Could not reach the server. Check that the backend is running and API_BASE_URL is correct.',
      0
    );
  }

  // Backend returns { data } on success, { error: { message } } on failure.
  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(json?.error?.message || `Request failed (${res.status})`, res.status);
  }

  return json.data as T;
}

const get = <T>(path: string) => request<T>(path, { method: 'GET' });
const post = <T>(path: string, body?: object) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

// requestsApi.ts (the layer RequestsContext actually uses) imports this —
// it was calling `apiRequest` which this file never exported, so every
// request/accept/cancel call was throwing "apiRequest is not a function"
// before it even reached the network.
export function apiRequest<T>(path: string, options: { method?: string; body?: object } = {}): Promise<T> {
  return request<T>(path, {
    method: options.method,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

// ─── Endpoint groups (mirrors the API reference doc) ────────────────────────

export const apiClient = {
  health: {
    check: () => get<{ status: string }>('/health'),
  },

  requests: {
    create: (payload: Partial<DeliveryRequest>) => post<DeliveryRequest>('/requests', payload),
    feed: () => get<DeliveryRequest[]>('/requests'),
    mine: (role: 'requester' | 'deliverer' = 'requester') =>
      get<DeliveryRequest[]>(`/requests/mine?role=${role}`),
    getById: (id: string) => get<DeliveryRequest>(`/requests/${id}`),
    accept: (id: string) => post<DeliveryRequest>(`/requests/${id}/accept`),
    cancel: (id: string, reason?: string) =>
      post<DeliveryRequest>(`/requests/${id}/cancel`, reason ? { reason } : undefined),
    confirmComplete: (id: string) => post<DeliveryRequest>(`/requests/${id}/confirm-complete`),
  },

  ratings: {
    create: (payload: { request_id: string; score: number; review?: string }) =>
      post<Rating>('/ratings', payload),
    forUser: (userId: string) => get<Rating[]>(`/ratings/user/${userId}`),
  },

  reports: {
    create: (payload: {
      type: ReportType;
      subject: string;
      description: string;
      request_id?: string;
      reported_user_id?: string;
    }) => post<Report>('/reports', payload),
    mine: () => get<Report[]>('/reports/mine'),
  },

  transactions: {
    create: (payload: {
      request_id: string;
      type: TransactionType;
      amount: number;
      method?: string;
    }) => post<Transaction>('/transactions', payload),
    confirm: (id: string) => post<Transaction>(`/transactions/${id}/confirm`),
    mine: () => get<Transaction[]>('/transactions/mine'),
    forRequest: (requestId: string) => get<Transaction[]>(`/transactions/request/${requestId}`),
  },

  messages: {
    send: (requestId: string, content: string) =>
      post<ChatMessage>(`/requests/${requestId}/messages`, { content }),
    history: (requestId: string) => get<ChatMessage[]>(`/requests/${requestId}/messages`),
  },
};

export { ApiError };