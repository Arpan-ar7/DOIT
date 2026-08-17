import React, { createContext, useContext, useState, ReactNode } from 'react';
import { isEmailFormatValid, isGrNoFormatValid, isPhoneFormatValid } from '../utils/validation';
import { isUsernameFormatValid, isUsernameTaken } from '../utils/username';

export type AuthUser = {
  name: string;
  email: string;
  grNo: string;
  phone: string;
  username: string;
  hostel: string;
  photoUri: string | null;
  sharesPhone: boolean; // NEW — controls whether your phone shows to whoever
  // accepts your request, AND whether it shows when you accept someone
  // else's. One preference, both directions — kept simple on purpose.
};

type RegisteredUser = {
  name: string;
  email: string;
  grNo: string;
  phone: string;
  password: string;
};

type ProfileUpdates = {
  name?: string;
  username?: string;
  hostel?: string;
  photoUri?: string | null;
  sharesPhone?: boolean; // NEW
};

type AuthContextValue = {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (email: string, grNo: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (
    name: string,
    email: string,
    grNo: string,
    phone: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (updates: ProfileUpdates) => { success: boolean; error?: string };
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function deriveUsername(name: string) {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return slug.slice(0, 20) || 'student';
}

const SEEDED_DEMO_USER: RegisteredUser = {
  name: 'Aarav Sharma',
  email: 'aarav@college.edu',
  grNo: '100234',
  phone: '9876543210',
  password: 'password123',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([SEEDED_DEMO_USER]);

  async function signup(name: string, email: string, grNo: string, phone: string, password: string) {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedGrNo = grNo.trim();

    if (!name.trim()) return { success: false, error: 'Enter your full name.' };
    if (!isEmailFormatValid(trimmedEmail)) return { success: false, error: 'Enter a valid email address.' };
    if (!isGrNoFormatValid(trimmedGrNo)) return { success: false, error: 'GR No must be exactly 6 digits.' };
    if (!isPhoneFormatValid(phone)) return { success: false, error: 'Enter a valid 10-digit phone number.' };
    if (password.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };

    const grNoTaken = registeredUsers.some((u) => u.grNo === trimmedGrNo);
    if (grNoTaken) {
      return { success: false, error: 'This GR No is already registered. Log in instead.' };
    }

    const newUser: RegisteredUser = {
      name: name.trim(),
      email: trimmedEmail,
      grNo: trimmedGrNo,
      phone: phone.trim(),
      password,
    };

    setRegisteredUsers((prev) => [...prev, newUser]);

    setUser({
      name: newUser.name,
      email: newUser.email,
      grNo: newUser.grNo,
      phone: newUser.phone,
      username: deriveUsername(newUser.name),
      hostel: '',
      photoUri: null,
      sharesPhone: false, // NEW — off by default, matches a privacy-safe default
    });
    setIsAuthenticated(true);
    return { success: true };
  }

  async function login(email: string, grNo: string, password: string) {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedGrNo = grNo.trim();

    if (!trimmedEmail || !trimmedGrNo || !password) {
      return { success: false, error: 'Fill in every field to continue.' };
    }

    const match = registeredUsers.find(
      (u) => u.email === trimmedEmail && u.grNo === trimmedGrNo && u.password === password,
    );

    if (!match) {
      return { success: false, error: "Email, GR No, and password don't match any account." };
    }

    setUser({
      name: match.name,
      email: match.email,
      grNo: match.grNo,
      phone: match.phone,
      username: deriveUsername(match.name),
      hostel: '',
      photoUri: null,
      sharesPhone: false, // NEW
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

    // sharesPhone (and every other field) just flows through via ...updates —
    // no special validation needed for a simple boolean toggle.
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