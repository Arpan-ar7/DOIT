import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { isEmailFormatValid, isGrNoFormatValid, isPhoneFormatValid } from '../utils/validation';
import { isUsernameFormatValid, isUsernameTaken } from '../utils/username';

export type AuthUser = {
  id: string; // real Supabase user id — needed later for creating requests
  name: string;
  email: string;
  grNo: string;
  phone: string;
  username: string; // local-only, see note above
  hostel: string; // local-only, see note above
  photoUri: string | null;
};

type ProfileUpdates = {
  name?: string;
  username?: string;
  hostel?: string;
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

  function setUserFromProfile(profile: any) {
    setUser({
      id: profile.id,
      name: profile.full_name,
      email: profile.email,
      grNo: String(profile.gr_number ?? ''),
      phone: profile.phone_number ?? '',
      username: deriveUsername(profile.full_name), // not persisted, see note
      hostel: '', // not persisted, see note
      photoUri: profile.profile_picture ?? null,
    });
  }

  async function loadProfile(userId: string) {
    const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error || !profile) {
      // Profile row missing/unreadable — don't leave the app half-logged-in.
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }
    setUserFromProfile(profile);
    setIsAuthenticated(true);
    setIsLoading(false);
  }

  // On app start: check if a session already exists (persisted via
  // AsyncStorage from a previous login), and keep listening for changes
  // (login/logout from anywhere in the app updates this automatically).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) loadProfile(data.session.user.id);
      else setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) loadProfile(session.user.id);
      else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    return () => sub.subscription.unsubscribe();
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

    if (!data.session) {
      // "Confirm email" is ON in Supabase — see note above.
      return {
        success: false,
        error: 'Account created, but email confirmation is required. Ask your backend dev to disable "Confirm email" in Supabase for now.',
      };
    }

    // Step 2 — matching profile row. gr_number is a real integer column.
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: name.trim(),
      email: trimmedEmail,
      phone_number: phone.trim(),
      gr_number: Number(trimmedGrNo),
    });

    if (profileError) {
      // 23505 = Postgres unique-constraint violation.
      const message =
        profileError.code === '23505'
          ? 'This GR No, email, or phone number is already registered.'
          : profileError.message;
      return { success: false, error: message };
    }

    await loadProfile(data.user.id);
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

    // Push name and profile picture to Supabase.
    // username/hostel stay local until the DB has matching columns.
    const dbUpdates: any = {};
    if (updates.name !== undefined && updates.name.trim() !== user.name) {
      dbUpdates.full_name = updates.name.trim();
    }
    if (updates.photoUri !== undefined) {
      dbUpdates.profile_picture = updates.photoUri;
    }

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
      if (error) return { success: false, error: error.message };
    }

    setUser({ ...user, ...updates, username: nextUsername });
    return { success: true };
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}