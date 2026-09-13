import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DeliveryRequest, RequestCategory, GoingTrip, initialGoingTrips, CATEGORY_EMOJIS } from '../constants/mockData';
import { useAuth } from './AuthContext';
import {
  getOpenFeed,
  getMyRequests,
  createRequestApi,
  acceptRequestApi,
  cancelRequestApi,
  completeRequestApi,
  ApiRequestRow,
} from '../lib/requestsApi';
import { getProfilesByIds, initialsFromName, ProfileRow } from '../lib/profilesApi';
import { getRatingsForRequests, submitRatingApi } from '../lib/ratingsApi';
import { supabase } from '../lib/supabase';

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
  goingTrips: GoingTrip[];
  createRequest: (input: NewRequestInput) => Promise<ActionResult>;
  cancelRequest: (requestId: string) => Promise<ActionResult>;
  acceptRequest: (requestId: string) => Promise<ActionResult>;
  advanceStatus: (requestId: string) => Promise<ActionResult>;
  rateRequest: (requestId: string, rating: number) => Promise<ActionResult>;
  announceTrip: (input: NewTripInput) => void;
  getRequestById: (id: string) => DeliveryRequest | undefined;
};

const RequestsContext = createContext<RequestsContextValue | undefined>(undefined);

function mapApiRequest(
  row: ApiRequestRow,
  profilesById: Record<string, ProfileRow>,
  ratingsByRequestId: Record<string, number> = {}
): DeliveryRequest {
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
    createdAt: row.created_at,
    acceptedAt: row.accepted_at ?? null,
    completedAt: row.completed_at ?? null,
    updatedAt: row.updated_at,
    isLateNightCraving: row.is_late_night_craving || false,
    status: row.status === 'expired' ? 'pending' : row.status,
    rating: ratingsByRequestId[row.id],
    requester: {
      id: row.requester_id,
      name: requesterProfile?.full_name ?? 'Unknown student',
      initials: requesterProfile ? initialsFromName(requesterProfile.full_name) : '??',
      hostel: '', // no hostel column in the DB yet
      rating: requesterProfile?.average_rating ?? 0,
      completedRequests: requesterProfile?.total_ratings ?? 0, // approximation
      photoUri: requesterProfile?.profile_picture ?? null,
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
          photoUri: delivererProfile.profile_picture ?? null,
        }
      : undefined,
  };
}

export function RequestsProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  const queryClient = useQueryClient();

  const { data: requests = [], isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['requests', user?.id],
    queryFn: async () => {
      const [feed, mine, delivering] = await Promise.all([
        getOpenFeed(),
        getMyRequests('requester'),
        getMyRequests('deliverer'),
      ]);
      const allRows = [...feed, ...mine, ...delivering];
      const uniqueRows = Array.from(new Map(allRows.map((r) => [r.id, r])).values());

      const profileIds = uniqueRows.flatMap((r) => [r.requester_id, r.deliverer_id].filter(Boolean) as string[]);
      const [profilesById, ratingsByRequestId] = await Promise.all([
        getProfilesByIds(profileIds),
        getRatingsForRequests(uniqueRows.map((r) => r.id), user?.id),
      ]);

      return uniqueRows.map((row) => mapApiRequest(row, profilesById, ratingsByRequestId));
    },
    enabled: isAuthenticated,
    staleTime: 30000,
  });

  const error = queryError ? queryError.message : null;
  const refresh = useCallback(async () => { await refetch(); }, [refetch]);

  // STILL mock/local — "going out" only stores one current status per
  // profile, not a history to fetch, and has no backend module yet.
  const [goingTrips, setGoingTrips] = useState<GoingTrip[]>(initialGoingTrips);

  useEffect(() => {
    if (!isAuthenticated) return;

    const channelName = `public:requests:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        () => {
          refetch();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ratings' },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, refetch]);

  async function createRequest(input: NewRequestInput): Promise<ActionResult> {
    try {
      const expiresAt = new Date(Date.now() + input.expiryHours * 3600_000).toISOString();
      await createRequestApi({
        item_name: input.itemName,
        category: input.category,
        approximate_price: input.itemBudget,
        delivery_fee: input.deliveryFee,
        notes: input.notes || undefined,
        pickup_location: input.shop || 'Not specified',
        dropoff_location: input.deliveryLocation,
        expires_at: expiresAt,
        expiry_hours: input.expiryHours, // backend uses this as the authoritative source
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
      // Optimistically update rating in cache immediately
      queryClient.setQueryData<DeliveryRequest[]>(['requests', user?.id], (old) => {
        if (!old) return old;
        return old.map((r) => (r.id === requestId ? { ...r, rating } : r));
      });
      await submitRatingApi({ request_id: requestId, score: rating });
      await refresh();
      return { success: true };
    } catch (err: any) {
      if (err.message?.includes('409')) {
        // If already rated on backend, ensure the UI is set and refreshed
        queryClient.setQueryData<DeliveryRequest[]>(['requests', user?.id], (old) => {
          if (!old) return old;
          return old.map((r) => (r.id === requestId ? { ...r, rating } : r));
        });
        await refresh();
        return { success: true };
      }
      await refresh();
      const message = err.message ?? 'Could not submit rating.';
      return { success: false, error: message };
    }
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

  const contextValue = useMemo(() => ({
    requests, loading, error, refresh,
    goingTrips,
    createRequest, cancelRequest, acceptRequest, advanceStatus, rateRequest,
    announceTrip, getRequestById,
  }), [
    requests, loading, error, refresh, goingTrips,
  ]);

  return (
    <RequestsContext.Provider value={contextValue}>
      {children}
    </RequestsContext.Provider>
  );
}

export function useRequests() {
  const ctx = useContext(RequestsContext);
  if (!ctx) throw new Error('useRequests must be used inside <RequestsProvider>');
  return ctx;
}