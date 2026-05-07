import { create } from 'zustand';
import { api } from '../api/client';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  fetchMe: async () => {
    set({ loading: true });
    try {
      const user = await api.get<User>('/auth/me');
      set({ user, initialized: true });
    } catch {
      set({ user: null, initialized: true });
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    await api.post('/auth/logout', {}).catch(() => {});
    set({ user: null });
  },

  setUser: (user) => set({ user }),
}));
