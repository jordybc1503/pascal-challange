'use client';

import { create } from 'zustand';
import { authApi, setAuthToken } from '@/lib/api';
import { socketClient } from '@/lib/socket';
import type { User, Tenant, LoginData } from '@/lib/schemas';

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  login: (data: LoginData) => Promise<void>;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  tenant: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  login: async (data: LoginData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login(data.email, data.password);
      set({ user: response.user, tenant: response.tenant, isLoading: false });
      socketClient.connect();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: () => {
    authApi.logout();
    socketClient.disconnect();
    set({ user: null, tenant: null, error: null });
  },

  initialize: async () => {
    // Prevent multiple initializations
    if (get().isInitialized) {
      return;
    }

    set({ isLoading: true });
    try {
      const user = await authApi.me();
      // Load tenant from localStorage
      const tenantData = typeof window !== 'undefined' ? localStorage.getItem('tenant') : null;
      const tenant = tenantData ? JSON.parse(tenantData) : null;
      set({ user, tenant, isLoading: false, isInitialized: true });
      socketClient.connect();
    } catch (error) {
      // If auth fails, clean up localStorage
      authApi.logout();
      set({ user: null, tenant: null, isLoading: false, isInitialized: true });
    }
  },
}));
