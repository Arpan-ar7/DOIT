import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { DeliveryRequest, RequestCategory, GoingTrip, initialGoingTrips, CATEGORY_EMOJIS } from '../constants/mockData';
import { formatClockTime } from '../utils/time';
import { useAuth } from './AuthContext';
import {
  getOpenFeed,
  getMyRequests,
  createRequestApi,
  acceptRequestApi,
  cancelRequestApi,
  completeRequestApi,
  submitRatingApi,
  ApiRequestRow,
} from '../lib/requestsApi';
import { getProfilesByIds, initialsFromName, ProfileRow } from '../lib/profilesApi';

export type ChatMessage = { id: string; requestId: string; fromMe: boolean; text: string; time: string; createdAt: number };

type NewRequestInput = {
  itemName: string;
  shop: string;
  emoji: string;
  category: RequestCategory;
  itemBudget: number;
  deliveryFee: number;
  notes: string;
  deliveryLocation: string;
  expiryHours: number; // accepted but not sent — see gap #2
};

type NewTripInput = { destination: string; leavingAt: string; backBy: string };

type ActionResult = { success: boolean; error?: string };

type RequestsContextValue = {
  requests: DeliveryRequest[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  messagesByRequest: Record<string, ChatMessage[]>;
  goingTrips: GoingTrip[];
  readStatus: Record<string, number>;
  createRequest: (input: NewRequestInput) => Promise<ActionResult>;
  cancelRequest: (requestId: string) => Promise<ActionResult>;
  acceptRequest: (requestId: string) => Promise<ActionResult>;
  advanceStatus: (requestId: string) => Promise<ActionResult>;
  rateRequest: (requestId: string, rating: number) => Promise<ActionResult>;
  sendMessage: (requestId: string, text: string, fromMe?: boolean) => void;
  seedConversation: (requestId: string, requesterFirstName: string) => void;
  markRead: (requestId: string) => void;
  announceTrip: (input: NewTripInput) => void;
  getRequestById: (id: string) => DeliveryRequest | undefined;
};

const RequestsContext = createContext<RequestsContextValue | undefined>(undefined);

function mapApiRequest(row: ApiRequestRow, profilesById: Record<string, ProfileRow>): DeliveryRequest {
  const categoryKey = (row.category as RequestCategory) || 'other';
  const emoji = CATEGORY_EMOJIS.find((c) => c.category === categoryKey)?.emoji ?? '📦';
  const requesterProfile = profilesById[row.requester_id];
  const delivererProfile = row.deliverer_id ? profilesById[row.deliverer_id] : undefined;

  return {
    id: row.id,
    itemName: row.item_name,
    shop: row.pickup_location === 'Not specified' ? '' : row.pickup_location,
    emoji,
    category: categoryKey,
    itemBudget: row.approximate_price ?? 0,
    deliveryFee: row.delivery_fee,
    notes: row.notes ?? '',
    deliveryLocation: row.dropoff_location,
    expiresAt: row.expires_at,
    // 'expired' isn't actually written by anything yet (no scheduled job
    // exists on the backend) — treat it as pending, let isExpired() handle it.
    status: row.status === 'expired' ? 'pending' : row.status,
    requester: {
      id: row.requester_id,
      name: requesterProfile?.full_name ?? 'Unknown student',
      initials: requesterProfile ? initialsFromName(requesterProfile.full_name) : '??',
      hostel: '', // no hostel column in the DB yet
      rating: requesterProfile?.average_rating ?? 0,
      completedRequests: requesterProfile?.total_ratings ?? 0, // approximation
    },
    accepterId: row.deliverer_id ?? undefined,
    accepter: delivererProfile
      ? {
          name: delivererProfile.full_name,
          initials: initialsFromName(delivererProfile.full_name),
          rating: delivererProfile.average_rating,
          completedRequests: delivererProfile.total_ratings,
          phone: '', // phone-sharing removed, per your last message
          sharePhone: false,
        }
      : undefined,
  };
}

export function RequestsProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  const [requests, setRequests] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // STILL mock/local — backend has no messages module yet, and "going out"
  // only stores one current status per profile, not a history to fetch.
  const [messagesByRequest, setMessagesByRequest] = useState<Record<string, ChatMessage[]>>({});
  const [goingTrips, setGoingTrips] = useState<GoingTrip[]>(initialGoingTrips);
  const [readStatus, setReadStatus] = useState<Record<string, number>>({});

  // Pulls the public feed + your posted requests + your accepted deliveries,
  // merges into ONE de-duplicated array — keeps every screen (Home, Orders,
  // etc.) working unchanged, since they already filter this locally.
  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const [feed, mine, delivering] = await Promise.all([
        getOpenFeed(),
        getMyRequests('requester'),
        getMyRequests('deliverer'),
      ]);
      const allRows = [...feed, ...mine, ...delivering];
      const uniqueRows = Array.from(new Map(allRows.map((r) => [r.id, r])).values());

      const profileIds = uniqueRows.flatMap((r) => [r.requester_id, r.deliverer_id].filter(Boolean) as string[]);
      const profilesById = await getProfilesByIds(profileIds);

      setRequests(uniqueRows.map((row) => mapApiRequest(row, profilesById)));
    } catch (err: any) {
      setError(err.message ?? 'Could not load requests.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createRequest(input: NewRequestInput): Promise<ActionResult> {
    try {
      await createRequestApi({
        item_name: input.itemName,
        category: input.category,
        approximate_price: input.itemBudget,
        delivery_fee: input.deliveryFee,
        notes: input.notes || undefined,
        pickup_location: input.shop || 'Not specified', // required by the DB; our UI made it optional
        dropoff_location: input.deliveryLocation,
      });
      await refresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message ?? 'Could not post request.' };
    }
  }

  async function cancelRequest(requestId: string): Promise<ActionResult> {
    try {
      await cancelRequestApi(requestId);
      await refresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message ?? 'Could not cancel request.' };
    }
  }

  async function acceptRequest(requestId: string): Promise<ActionResult> {
    try {
      await acceptRequestApi(requestId);
      await refresh();
      return { success: true };
    } catch (err: any) {
      const message = err.message?.includes('409')
        ? 'Someone else already accepted this request.'
        : err.message ?? 'Could not accept request.';
      return { success: false, error: message };
    }
  }

  // Collapsed to one step — see gap #1. Always jumps straight to completed.
  async function advanceStatus(requestId: string): Promise<ActionResult> {
    try {
      await completeRequestApi(requestId);
      await refresh();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message ?? 'Could not update status.' };
    }
  }

  async function rateRequest(requestId: string, rating: number): Promise<ActionResult> {
    try {
      await submitRatingApi({ request_id: requestId, score: rating });
      await refresh();
      return { success: true };
    } catch (err: any) {
      const message = err.message?.includes('409') ? 'You already rated this delivery.' : err.message ?? 'Could not submit rating.';
      return { success: false, error: message };
    }
  }

  // ── Unchanged — still local/mock, no backend support yet ──
  function sendMessage(requestId: string, text: string, fromMe: boolean = true) {
    const now = Date.now();
    const message: ChatMessage = {
      id: `m${now}-${Math.random().toString(36).slice(2, 6)}`,
      requestId,
      fromMe,
      text,
      time: formatClockTime(new Date(now)),
      createdAt: now,
    };
    setMessagesByRequest((prev) => ({ ...prev, [requestId]: [...(prev[requestId] ?? []), message] }));
  }

  function seedConversation(requestId: string, requesterFirstName: string) {
    setMessagesByRequest((prev) => {
      if (prev[requestId]?.length) return prev;
      const now = Date.now();
      const seedMessage: ChatMessage = {
        id: `seed-${requestId}`,
        requestId,
        fromMe: false,
        text: `Hi! Thanks for accepting my request 😊`,
        time: formatClockTime(new Date(now)),
        createdAt: now,
      };
      return { ...prev, [requestId]: [seedMessage] };
    });
  }

  function markRead(requestId: string) {
    setReadStatus((prev) => ({ ...prev, [requestId]: Date.now() }));
  }

  function announceTrip(input: NewTripInput) {
    if (!user) return;
    const trip: GoingTrip = {
      id: `g${Date.now()}`,
      studentName: user.name,
      studentInitials: initialsFromName(user.name),
      isCurrentUser: true,
      ...input,
    };
    setGoingTrips((prev) => [trip, ...prev]);
  }

  function getRequestById(id: string) {
    return requests.find((r) => r.id === id);
  }

  return (
    <RequestsContext.Provider
      value={{
        requests, loading, error, refresh,
        messagesByRequest, goingTrips, readStatus,
        createRequest, cancelRequest, acceptRequest, advanceStatus, rateRequest,
        sendMessage, seedConversation, markRead, announceTrip, getRequestById,
      }}
    >
      {children}
    </RequestsContext.Provider>
  );
}

export function useRequests() {
  const ctx = useContext(RequestsContext);
  if (!ctx) throw new Error('useRequests must be used inside <RequestsProvider>');
  return ctx;
}