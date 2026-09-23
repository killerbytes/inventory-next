"use client";

import { SessionUserData } from "@/schemas";
import React, { createContext, useContext, useEffect, useRef } from "react";
import { createStore, useStore } from "zustand";

export interface AuthState {
  token: string | null;
  user: SessionUserData | null;
  isAuthenticated: boolean;
  setToken: (token: string | null) => void;
  setUser: (user: SessionUserData | null) => void;
  logout: () => void;
}

export type AuthStore = ReturnType<typeof createAuthStore>;

/**
 * Factory to create an isolated Zustand auth store per request or test.
 * Prevents cross-request state leakage on the server in Next.js SSR.
 */
export const createAuthStore = (initProps?: Partial<AuthState>) => {
  return createStore<AuthState>()((set) => ({
    token: initProps?.token ?? null,
    user: initProps?.user ?? null,
    isAuthenticated: initProps?.isAuthenticated ?? !!initProps?.user,
    setToken: (token) => set({ token }),
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    logout: () => set({ token: null, user: null, isAuthenticated: false }),
  }));
};

export const defaultAuthStore = createAuthStore();

export const AuthContext = createContext<AuthStore | null>(null);

export interface AuthProviderProps {
  user?: SessionUserData | null;
  token?: string | null;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Provider wrapping the application to supply isomorphic auth state.
 * Synchronously initializes the store on both SSR render and client hydration
 * using the server-supplied session user to guarantee hydration parity.
 */
export function AuthProvider({ user, token, children }: AuthProviderProps) {
  const storeRef = useRef<AuthStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = createAuthStore({
      user: user ?? null,
      token: token ?? null,
      isAuthenticated: !!user,
    });
  }

  useEffect(() => {
    if (user !== undefined) {
      storeRef.current?.getState().setUser(user ?? null);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={storeRef.current}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth state. Reads from AuthContext if present,
 * falling back to the default standalone store for non-wrapped contexts or unit tests.
 */
export function useAuthStore<T = AuthState>(
  selector?: (state: AuthState) => T,
): T {
  const contextStore = useContext(AuthContext);
  const targetStore = contextStore ?? defaultAuthStore;
  return useStore(targetStore, selector ?? ((state) => state as unknown as T));
}

// Attach store controls for backward compatibility and test setup
useAuthStore.getState = defaultAuthStore.getState;
useAuthStore.setState = defaultAuthStore.setState;
useAuthStore.subscribe = defaultAuthStore.subscribe;
