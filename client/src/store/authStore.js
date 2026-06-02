import { create } from 'zustand';
import api from '@/lib/api';

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('cullective_token'),
  isLoading: false,
  isAuthenticated: !!localStorage.getItem('cullective_token'),

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('cullective_token', data.data.token);
      set({ user: data.data.user, token: data.data.token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, message: err.message || 'Login failed' };
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      localStorage.setItem('cullective_token', data.data.token);
      set({ user: data.data.user, token: data.data.token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, message: err.message || 'Registration failed' };
    }
  },

  googleLogin: async (credential) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/google', { credential });
      localStorage.setItem('cullective_token', data.data.token);
      set({ user: data.data.user, token: data.data.token, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, message: err.message || 'Google login failed' };
    }
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.data.user, isAuthenticated: true });
    } catch {
      set({ user: null, token: null, isAuthenticated: false });
      localStorage.removeItem('cullective_token');
    }
  },

  logout: () => {
    localStorage.removeItem('cullective_token');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (updates) => set((state) => ({ user: { ...state.user, ...updates } })),
}));

export default useAuthStore;
