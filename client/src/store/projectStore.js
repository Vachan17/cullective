import { create } from 'zustand';
import api from '@/lib/api';

const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  pagination: null,

  fetchProjects: async (params = {}) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/projects', { params });
      set({ projects: data.data, pagination: data.pagination, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  createProject: async (projectData) => {
    const { data } = await api.post('/projects', projectData);
    set((s) => ({ projects: [data.data.project, ...s.projects] }));
    return data.data.project;
  },

  fetchProject: async (id) => {
    set({ isLoading: true });
    const { data } = await api.get(`/projects/${id}`);
    set({ currentProject: data.data.project, isLoading: false });
    return data.data.project;
  },

  updateProject: async (id, updates) => {
    const { data } = await api.put(`/projects/${id}`, updates);
    set((s) => ({
      projects: s.projects.map(p => p._id === id ? data.data.project : p),
      currentProject: s.currentProject?._id === id ? data.data.project : s.currentProject,
    }));
  },

  deleteProject: async (id) => {
    await api.delete(`/projects/${id}`);
    set((s) => ({ projects: s.projects.filter(p => p._id !== id) }));
  },

  getProjectStats: async (id) => {
    const { data } = await api.get(`/projects/${id}/stats`);
    return data.data;
  },
}));

export default useProjectStore;
