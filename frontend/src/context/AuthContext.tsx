import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { isEmailFormatValid, isGrNoFormatValid, isPhoneFormatValid } from '../utils/validation';
import { isUsernameFormatValid, isUsernameTaken } from '../utils/username';
import { Platform, Alert } from 'react-native';
import { registerForPushNotificationsAsync } from '../lib/notifications';
import { apiClient } from '../lib/apiClient';
import { uploadProfilePicture } from '../lib/storage';

export type AuthUser = {
  id: string; // real Supabase user id — needed later for creating requests
  name: string;
  email: string;
  grNo: string;
  phone: string;
  username: string; // local-only, see note above
  hostel: string; // local-only, see note above
  photoUri: string | null;
  rating: number;
  totalRatings: number;
};

type ProfileUpdates = {
  name?: string;
  username?: string;
  hostel?: string;
  phone?: string;
  photoUri?: string | null;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean; // true while checking for an existing session on app start
  user: AuthUser | null;
  login: (email: string, grNo: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (
    name: string,
    email: string,
    grNo: string,
    phone: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: ProfileUpdates) => Promise<{ success: boolean; error?: string }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function deriveUsername(name: string) {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return slug.slice(0, 20) || 'student';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  function setUserFromProfile(profile: any, authUser?: any) {
    const meta = authUser?.user_metadata || {};
    setUser({
      id: profile.id || authUser?.id,
      name: profile.full_name || meta.full_name || meta.name || 'Student',
      email: profile.email || authUser?.email || '',
      grNo: String(profile.gr_number ?? meta.grNo ?? ''),
      phone: profile.phone_number ?? meta.phone ?? '',
      username: profile.username || meta.username || deriveUsername(profile.full_name || meta.full_name || 'student'),
      hostel: profile.hostel || meta.hostel || '',
      photoUri: profile.profile_picture || meta.avatar_url || null,
      rating: profile.average_rating ?? 0,
      totalRatings: profile.total_ratings ?? 0,
    });
  }

  async function loadProfile(userId: string) {
    try {
      const [profileRes, authUserRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.auth.getUser(),
      ]);
      const profile = profileRes.data;
      const authUser = authUserRes.data?.user;
      if (!profile && !authUser) {
        // Profile row missing/unreadable — don't leave the app half-logged-in.
        await supabase.auth.signOut();
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      setUserFromProfile(profile || {}, authUser);
      setIsAuthenticated(true);
      setIsLoading(false);

      // Register Push Token after successful login / load in background
      registerForPushNotificationsAsync().then((token) => {
        if (token) {
          const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
          apiClient.notifications.registerToken(token, platform).then(() => {
            console.log('Token saved to DB successfully');
          }).catch((err) => {
            console.warn('Failed to register push token with backend:', err);
          });
        }
      }).catch((err) => {
        console.warn('Could not get device push token:', err);
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }

  // On app start: check if a session already exists (persisted via
  // AsyncStorage from a previous login), and keep listening for changes
  // (login/logout from anywhere in the app updates this automatically).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) loadProfile(data.session.user.id);
      else setIsLoading(false);
    }).catch((err) => {
      console.error('Failed to get session:', err);
      setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) loadProfile(session.user.id);
      else {
        setUser(null);
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    });

    // When a rating is submitted by any requester, the backend updates
    // profiles.average_rating and profiles.total_ratings. Listen for that
    // change and re-load our profile row so the UI reflects new values.
    const channelName = `auth:profile_ratings:${Math.random().toString(36).slice(2)}`;
    const ratingsChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        async (payload) => {
          const { data: sessionData } = await supabase.auth.getSession();
          const uid = sessionData.session?.user.id;
          if (uid && (payload.new as any).id === uid) {
            // Only refresh the rating-related fields to avoid a full reload
            setUser((prev) =>
              prev
                ? {
                    ...prev,
                    rating: (payload.new as any).average_rating ?? prev.rating,
                    totalRatings: (payload.new as any).total_ratings ?? prev.totalRatings,
                  }
                : prev
            );
          }
        }
      )
      .subscribe();

    return () => {
      sub.subscription.unsubscribe();
      supabase.removeChannel(ratingsChannel);
    };
  }, []);

  async function signup(name: string, email: string, grNo: string, phone: string, password: string) {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedGrNo = grNo.trim();

    if (!name.trim()) return { success: false, error: 'Enter your full name.' };
    if (!isEmailFormatValid(trimmedEmail)) return { success: false, error: 'Enter a valid email address.' };
    if (!isGrNoFormatValid(trimmedGrNo)) return { success: false, error: 'GR No must be exactly 6 digits.' };
    if (!isPhoneFormatValid(phone)) return { success: false, error: 'Enter a valid 10-digit phone number.' };
    if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };

    // Step 1 — real Supabase login credentials.
    const { data, error } = await supabase.auth.signUp({ email: trimmedEmail, password });
    if (error) return { success: false, error: error.message };
    if (!data.user) return { success: false, error: 'Signup failed. Try again.' };

    // Step 2 — matching profile row. gr_number is a real integer column.
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: name.trim(),
      email: trimmedEmail,
      phone_number: phone.trim(),
      gr_number: Number(trimmedGrNo),
      college_id: 'e407380e-1fa8-47bd-bc64-b5d0c4712c91',
    });

    if (profileError) {
      // 23505 = Postgres unique-constraint violation.
      const message =
        profileError.code === '23505'
          ? 'This GR No, email, or phone number is already registered.'
          : profileError.message;
      return { success: false, error: message };
    }

    // Step 3 — Explicitly sign in to initialize the active persistent session & JWT token
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (signInError || !signInData.user) {
      if (!data.session) {
        return {
          success: false,
          error: 'Account created, but email confirmation is required. Ask your backend dev to disable "Confirm email" in Supabase for now.',
        };
      }
      return { success: false, error: signInError?.message || 'Login after signup failed.' };
    }

    await loadProfile(signInData.user.id);
    return { success: true };
  }

  async function login(email: string, grNo: string, password: string) {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedGrNo = grNo.trim();

    if (!trimmedEmail || !trimmedGrNo || !password) {
      return { success: false, error: 'Fill in every field to continue.' };
    }

    // Step 1 — Supabase only checks email + password.
    const { data, error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
    if (error || !data.user) {
      return { success: false, error: 'Email or password is incorrect.' };
    }

    // Step 2 — the "double verification": GR No has to match too.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      return { success: false, error: 'Could not find your profile. Contact support.' };
    }

    if (String(profile.gr_number) !== trimmedGrNo) {
      await supabase.auth.signOut(); // password was right, GR No wasn't
      return { success: false, error: "Email, GR No, and password don't match any account." };
    }

    setUserFromProfile(profile);
    setIsAuthenticated(true);
    return { success: true };
  }

  async function logout() {
    try {
      // Try to unregister the token before signing out
      const token = await registerForPushNotificationsAsync();
      if (token) {
        await apiClient.notifications.unregisterToken(token);
      }
    } catch (err) {
      console.error('Failed to unregister push token:', err);
    }

    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
  }

  async function updateProfile(updates: ProfileUpdates) {
    if (!user) return { success: false, error: 'Not logged in.' };

    let nextUsername = user.username;
    if (updates.username !== undefined) {
      const normalized = updates.username.trim().toLowerCase();
      if (!isUsernameFormatValid(normalized)) {
        return { success: false, error: 'Username must be 3–20 characters: letters, numbers, and underscores only.' };
      }
      if (isUsernameTaken(normalized, user.username)) {
        return { success: false, error: 'That username is already taken.' };
      }
      nextUsername = normalized;
    }

    const dbUpdates: any = {};
    if (updates.name !== undefined) {
      dbUpdates.full_name = updates.name.trim();
    }
    if (updates.phone !== undefined) {
      dbUpdates.phone_number = updates.phone.trim();
    }

    // Upload profile picture to Supabase Storage if it's a local file.
    let finalPhotoUrl = user.photoUri;
    if (updates.photoUri !== undefined && updates.photoUri !== null) {
      const isLocalFile = !updates.photoUri.startsWith('http');
      if (isLocalFile) {
        try {
          finalPhotoUrl = await uploadProfilePicture(user.id, updates.photoUri);
          dbUpdates.profile_picture = finalPhotoUrl;
        } catch (e: any) {
          console.error('[updateProfile] Upload failed:', e);
          return { success: false, error: e.message || 'Failed to upload profile picture.' };
        }
      } else {
        finalPhotoUrl = updates.photoUri;
        dbUpdates.profile_picture = updates.photoUri;
      }
    } else if (updates.photoUri === null) {
      finalPhotoUrl = null;
      dbUpdates.profile_picture = null;
    }

    // Try writing to profiles table (including username/hostel)
    const extraDbUpdates: any = { ...dbUpdates };
    if (updates.username !== undefined) extraDbUpdates.username = nextUsername;
    if (updates.hostel !== undefined) extraDbUpdates.hostel = updates.hostel.trim();

    if (Object.keys(extraDbUpdates).length > 0) {
      const { error } = await supabase.from('profiles').update(extraDbUpdates).eq('id', user.id);
      if (error) {
        // If column username/hostel doesn't exist on profiles table, retry with core dbUpdates
        if (error.message?.includes('column') || error.code === '42703') {
          if (Object.keys(dbUpdates).length > 0) {
            await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
          }
        } else {
          console.error('[updateProfile] DB update error:', error);
          return { success: false, error: error.message };
        }
      }
    }

    // Also persist in Supabase Auth user metadata
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: updates.name ? updates.name.trim() : user.name,
          username: nextUsername,
          hostel: updates.hostel !== undefined ? updates.hostel.trim() : user.hostel,
          phone: updates.phone !== undefined ? updates.phone.trim() : user.phone,
          avatar_url: finalPhotoUrl,
        },
      });
    } catch (authMetaErr) {
      console.warn('[updateProfile] Failed to update auth metadata:', authMetaErr);
    }

    setUser((prev) =>
      prev
        ? {
            ...prev,
            name: updates.name !== undefined ? updates.name.trim() : prev.name,
            username: nextUsername,
            hostel: updates.hostel !== undefined ? updates.hostel.trim() : prev.hostel,
            phone: updates.phone !== undefined ? updates.phone.trim() : prev.phone,
            photoUri: finalPhotoUrl,
          }
        : null
    );

    return { success: true };
  }

  const contextValue = useMemo(() => ({
    isAuthenticated, isLoading, user, login, signup, logout, updateProfile
  }), [isAuthenticated, isLoading, user]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}