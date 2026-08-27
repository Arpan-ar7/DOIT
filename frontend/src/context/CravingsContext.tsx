import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CravingPost, CravingStatus } from '../constants/mockData';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'cravings_posts';

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
  getCravingById: (id: string) => CravingPost | undefined;
};

const CravingsContext = createContext<CravingsContextValue | undefined>(undefined);

export function CravingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cravings, setCravings] = useState<CravingPost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCravings = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCravings(JSON.parse(stored));
      }
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCravings();
  }, [loadCravings]);

  const persist = useCallback(async (updated: CravingPost[]) => {
    setCravings(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (_) {}
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadCravings();
  }, [loadCravings]);

  const initials = (name: string) =>
    name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

  async function postCraving(input: NewCravingInput): Promise<ActionResult> {
    const newCraving: CravingPost = {
      id: `crv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      what: input.what,
      hostel: input.hostel,
      price: input.price,
      note: input.note,
      status: 'open',
      postedBy: {
        id: user?.id ?? 'anon_' + Math.random().toString(36).slice(2, 7),
        name: user?.name ?? 'Night Owl',
        initials: user ? initials(user.name) : 'NO',
      },
      createdAt: new Date().toISOString(),
    };
    await persist([newCraving, ...cravings]);
    return { success: true };
  }

  async function acceptCraving(id: string): Promise<ActionResult> {
    const updated = cravings.map((c) => {
      if (c.id !== id) return c;
      if (c.status !== 'open') return c;
      return {
        ...c,
        status: 'accepted' as CravingStatus,
        acceptedBy: {
          id: user?.id ?? 'anon_' + Math.random().toString(36).slice(2, 7),
          name: user?.name ?? 'Helpful Ghost',
          initials: user ? initials(user.name) : 'HG',
        },
      };
    });
    await persist(updated);
    return { success: true };
  }

  function getCravingById(id: string) {
    return cravings.find((c) => c.id === id);
  }

  const contextValue = useMemo(
    () => ({
      cravings,
      loading,
      refresh,
      postCraving,
      acceptCraving,
      getCravingById,
    }),
    [cravings, loading, refresh],
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
