import React, { createContext, useContext, useState, ReactNode } from 'react';
import { isUsernameFormatValid, isUsernameTaken } from '../utils/username';

export type AuthUser = {
  name: string;
  email: string;
  username: string;
  hostel: string;
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
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: ProfileUpdates) => { success: boolean; error?: string };
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function deriveUsername(name: string) {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return slug.slice(0, 20) || 'student';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  async function login(email: string, password: string) {
    if (!email.trim() || !password.trim()) {
      return { success: false, error: 'Enter your email and password.' };
    }
    const name = email.split('@')[0];
    setUser({ name, email: email.trim(), username: deriveUsername(name), hostel: '', photoUri: null });
    setIsAuthenticated(true);
    return { success: true };
  }

  async function signup(name: string, email: string, password: string) {
    if (!name.trim() || !email.trim() || !password.trim()) {
      return { success: false, error: 'Fill in every field to continue.' };
    }
    setUser({
      name: name.trim(),
      email: email.trim(),
      username: deriveUsername(name),
      hostel: '',
      photoUri: null,
    });
    setIsAuthenticated(true);
    return { success: true };
  }

  function logout() {
    setUser(null);
    setIsAuthenticated(false);
  }

  function updateProfile(updates: ProfileUpdates) {
    if (!user) return { success: false, error: 'Not logged in.' };

    let nextUsername = user.username;
    if (updates.username !== undefined) {
      const normalized = updates.username.trim().toLowerCase();
      if (!isUsernameFormatValid(normalized)) {
        return {
          success: false,
          error: 'Username must be 3–20 characters: letters, numbers, and underscores only.',
        };
      }
      if (isUsernameTaken(normalized, user.username)) {
        return { success: false, error: 'That username is already taken.' };
      }
      nextUsername = normalized;
    }

    setUser({ ...user, ...updates, username: nextUsername });
    return { success: true };
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}