import { create } from 'zustand';
import api from '@/lib/api';

const BATCH_SIZE = 20; // files per HTTP request

const usePhotoStore = create((set, get) => ({
  photos: [],
  selectedPhotos: new Set(),
  currentPhoto: null,
  isLoading: false,
  isUploading: false,
  uploadProgress: 0,
  uploadStats: { uploaded: 0, total: 0, currentBatch: 0, totalBatches: 0 },
  pagination: null,
  viewMode: 'grid',
  filters: {},

  // ── Chunked browser upload (batches of 20) ──────────────────────────────
  uploadPhotos: async (projectId, files) => {
    set({ isUploading: true, uploadProgress: 0, uploadStats: { uploaded: 0, total: files.length, currentBatch: 0, totalBatches: Math.ceil(files.length / BATCH_SIZE) } });

    const batches = [];
    for (let i = 0; i < files.length; i += BATCH_SIZE) batches.push(files.slice(i, i + BATCH_SIZE));

    let uploaded = 0;
    const allPhotos = [];

    try {
      for (let bi = 0; bi < batches.length; bi++) {
        const batch = batches[bi];
        const formData = new FormData();
        batch.forEach(f => formData.append('photos', f));

        const { data } = await api.post(`/photos/upload/${projectId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            const batchPct = e.total ? e.loaded / e.total : 1;
            const overall = Math.round(((bi + batchPct) / batches.length) * 100);
            set({ uploadProgress: overall, uploadStats: { uploaded, total: files.length, currentBatch: bi + 1, totalBatches: batches.length } });
          },
        });

        uploaded += data.data.count;
        allPhotos.push(...data.data.photos);
        set({ uploadProgress: Math.round(((bi + 1) / batches.length) * 100), uploadStats: { uploaded, total: files.length, currentBatch: bi + 1, totalBatches: batches.length } });
      }

      // Finalize — triggers background AI analysis
      await api.post(`/photos/finalize/${projectId}`);

      set(s => ({ photos: [...allPhotos, ...s.photos], isUploading: false, uploadProgress: 100 }));
      return { success: true, count: uploaded };
    } catch (err) {
      set({ isUploading: false, uploadProgress: 0 });
      return { success: false, message: err.message || 'Upload failed' };
    }
  },

  // ── Local folder scan (SSE stream) ──────────────────────────────────────
  scanLocalFolder: async (projectId, folderPath, onProgress) => {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('cullective_token');
      const url = `${import.meta.env.VITE_API_URL || '/api'}/scan/start`;

      // Use fetch for SSE with POST body
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ projectId, folderPath }),
      }).then(res => {
        if (!res.ok) return res.json().then(e => reject(new Error(e.message || 'Scan failed')));
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        const pump = () => reader.read().then(({ done, value }) => {
          if (done) return resolve({ success: true });
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop();
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const evt = JSON.parse(line.slice(6));
              onProgress?.(evt);
              if (evt.type === 'done') resolve({ success: true });
              if (evt.type === 'error') reject(new Error(evt.message));
            } catch {}
          }
          pump();
        });
        pump();
      }).catch(reject);
    });
  },

  fetchPhotos: async (projectId, params = {}) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/photos/project/${projectId}`, { params: { ...get().filters, ...params } });
      set({ photos: data.data, pagination: data.pagination, isLoading: false });
    } catch { set({ isLoading: false }); }
  },

  updatePhotoStatus: async (id, status, currentFilter = '') => {
    const { data } = await api.put(`/photos/${id}/status`, { status });
    set(s => {
      if (status === 'rejected' && currentFilter !== 'rejected') {
        return { photos: s.photos.filter(p => p._id !== id) };
      }
      return { photos: s.photos.map(p => p._id === id ? data.data.photo : p) };
    });
  },

  bulkAction: async (action) => {
    const { selectedPhotos } = get();
    if (!selectedPhotos.size) return;
    await api.post('/photos/bulk', { photoIds: [...selectedPhotos], action });
    set({ selectedPhotos: new Set() });
    return { modifiedCount: selectedPhotos.size };
  },

  toggleSelect: (id) => set(s => {
    const next = new Set(s.selectedPhotos);
    next.has(id) ? next.delete(id) : next.add(id);
    return { selectedPhotos: next };
  }),
  selectAll: () => set(s => ({ selectedPhotos: new Set(s.photos.map(p => p._id)) })),
  clearSelection: () => set({ selectedPhotos: new Set() }),
  setViewMode: mode => set({ viewMode: mode }),
  setFilters: filters => set({ filters }),
  setCurrentPhoto: photo => set({ currentPhoto: photo }),
}));

export default usePhotoStore;
