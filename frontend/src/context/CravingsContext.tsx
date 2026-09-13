import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { CravingPost, CravingStatus } from '../constants/mockData';
import { useAuth } from './AuthContext';
import { acceptRequestApi, completeRequestApi } from '../lib/requestsApi';

type NewCravingInput = {
  what: string;
  hostel: string;
  price: number;
  note: string;
};

type ActionResult = { success: boolean; error?: string };

type CravingsContextValue = {
  cravings: CravingPost[];
  loading: boolean;
  refresh: () => Promise<void>;
  postCraving: (input: NewCravingInput) => Promise<ActionResult>;
  acceptCraving: (id: string) => Promise<ActionResult>;
  markAsDelivered: (id: string) => Promise<ActionResult>;
  getCravingById: (id: string) => CravingPost | undefined;
};

const CravingsContext = createContext<CravingsContextValue | undefined>(undefined);

export function CravingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cravings, setCravings] = useState<CravingPost[]>([]);
  const [loading, setLoading] = useState(true);

  const initials = (name: string) =>
    name ? name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() : 'NO';

  const loadCravings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          id,
          item_name,
          dropoff_location,
          approximate_price,
          notes,
          status,
          created_at,
          requester:profiles!requester_id(id, full_name),
          deliverer:profiles!deliverer_id(id, full_name)
        `)
        .eq('is_late_night_craving', true)
        .or(`status.in.(accepted,in_progress),and(status.eq.pending,expires_at.gte.${new Date().toISOString()})`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cravings:', error);
      } else if (data) {
        const mappedCravings: CravingPost[] = data.map((row: any) => {
          let uiStatus: CravingStatus = 'open';
          if (row.status === 'accepted' || row.status === 'in_progress') {
            uiStatus = 'accepted';
          } else if (row.status === 'completed' || row.status === 'done') {
            uiStatus = 'done';
          }

          return {
            id: row.id,
            what: row.item_name,
            hostel: row.dropoff_location,
            price: row.approximate_price || 0,
            note: row.notes || '',
            status: uiStatus,
            createdAt: row.created_at,
            postedBy: {
              id: row.requester?.id || 'unknown',
              name: row.requester?.full_name || 'Night Owl',
              initials: initials(row.requester?.full_name),
            },
            ...(row.deliverer && {
              acceptedBy: {
                id: row.deliverer.id,
                name: row.deliverer.full_name,
                initials: initials(row.deliverer.full_name),
              }
            })
          };
        });
        setCravings(mappedCravings);
      }
    } catch (err) {
      console.error('Exception loading cravings', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCravings();
  }, [loadCravings]);

  useEffect(() => {
    if (!user) return;
    const channelName = `public:cravings:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests', filter: 'is_late_night_craving=eq.true' },
        () => {
          loadCravings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadCravings]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadCravings();
  }, [loadCravings]);

  const postCraving = useCallback(async (input: NewCravingInput): Promise<ActionResult> => {
    if (!user) return { success: false, error: 'Not logged in.' };

    const newRequest = {
      item_name: input.what,
      approximate_price: input.price,
      dropoff_location: input.hostel,
      notes: input.note,
      pickup_location: 'Late Night Craving',
      delivery_fee: 0,
      status: 'pending',
      is_late_night_craving: true,
      requester_id: user.id,
      // Expire at next 8:00 AM IST so the cron sweep catches it
      expires_at: (() => {
        const now = new Date();
        // Build "today 8 AM IST" → UTC 02:30
        const todayMorning = new Date(now);
        todayMorning.setUTCHours(2, 30, 0, 0); // 8:00 AM IST = 02:30 UTC
        // If it's already past 8 AM IST today, target tomorrow 8 AM
        const target = now < todayMorning ? todayMorning : new Date(todayMorning.getTime() + 24 * 60 * 60 * 1000);
        return target.toISOString();
      })(),
    };

    const { error } = await supabase.from('requests').insert(newRequest);
    
    if (error) {
      console.error('Error posting craving:', error);
      return { success: false, error: error.message };
    }

    await loadCravings();
    return { success: true };
  }, [user, loadCravings]);

  const acceptCraving = useCallback(async (id: string): Promise<ActionResult> => {
    if (!user) return { success: false, error: 'Not logged in.' };

    try {
      await acceptRequestApi(id);
    } catch (err: any) {
      console.error('Error accepting craving:', err);
      return { success: false, error: err.message ?? 'Failed to accept craving' };
    }

    await loadCravings();
    return { success: true };
  }, [user, loadCravings]);

  const markAsDelivered = useCallback(async (id: string): Promise<ActionResult> => {
    if (!user) return { success: false, error: 'Not logged in.' };
    
    try {
      await completeRequestApi(id);
    } catch (err: any) {
      console.error('Error marking craving as delivered:', err);
      return { success: false, error: err.message ?? 'Failed to mark as delivered' };
    }
    
    await loadCravings();
    return { success: true };
  }, [user, loadCravings]);

  const getCravingById = useCallback((id: string) => {
    return cravings.find((c) => c.id === id);
  }, [cravings]);

  const contextValue = useMemo(
    () => ({
      cravings,
      loading,
      refresh,
      postCraving,
      acceptCraving,
      markAsDelivered,
      getCravingById,
    }),
    [cravings, loading, refresh, postCraving, acceptCraving, markAsDelivered, getCravingById],
  );

  return (
    <CravingsContext.Provider value={contextValue}>
      {children}
    </CravingsContext.Provider>
  );
}

export function useCravings() {
  const ctx = useContext(CravingsContext);
  if (!ctx) throw new Error('useCravings must be used inside <CravingsProvider>');
  return ctx;
}
