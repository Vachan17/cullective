import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RefreshCw, Star, Trash2, ChevronRight, Grid3X3, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import PhotoCard from '@/components/photos/PhotoCard';
import { toast } from '@/components/ui/Toaster';
import { getScoreColor } from '@/lib/utils';
import usePhotoStore from '@/store/photoStore';
import api from '@/lib/api';

// Category → tag/status map for fetching photos
const CATEGORY_QUERY = {
  best_picks:       { tag: 'best-pick' },
  blurry:           { tag: 'blurry' },
  closed_eyes:      { tag: 'closed-eyes' },
  portraits:        { tag: 'portrait' },
  group_photos:     { tag: 'group' },
  couple_photos:    { tag: 'couple' },
  black_white:      { tag: 'black-and-white' },
  color_graded:     { tag: 'color-graded' },
  instagram_worthy: { tag: 'instagram-worthy' },
  album_ready:      { tag: 'best-pick' },
  noisy:            { tag: 'noisy' },
  wedding:          { tag: 'wedding' },
  night:            { tag: 'night-shot' },
  rejected:         { status: 'rejected' },
};

// Colour pill shown next to each collection row
const colourDot = (color) => (
  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 inline-block" style={{ backgroundColor: color }} />
);

export default function CollectionsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { updatePhotoStatus } = usePhotoStore();

  const [collections, setCollections]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [rebuilding, setRebuilding]     = useState(false);
  const [activeId, setActiveId]         = useState(null);
  const [colPhotos, setColPhotos]       = useState([]);
  const [colLoading, setColLoading]     = useState(false);

  const activeCol = collections.find(c => c._id === activeId) || null;

  // ── Load collections list ─────────────────────────────────────────────────
  const loadCollections = useCallback(() => {
    setLoading(true);
    api.get(`/collections/project/${projectId}`)
      .then(r => {
        const cols = (r.data.data.collections || []).filter(c => c.photoCount > 0);
        setCollections(cols);
        // Auto-select first non-empty collection
        if (cols.length && !activeId) setActiveId(cols[0]._id);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  useEffect(() => { loadCollections(); }, [loadCollections]);

  // ── Load photos for active collection ────────────────────────────────────
  useEffect(() => {
    if (!activeId) return;
    const col = collections.find(c => c._id === activeId);
    if (!col) return;
    setColLoading(true);
    setColPhotos([]);

    const q = CATEGORY_QUERY[col.category] || {};
    const params = { limit: 300, ...q };

    api.get(`/photos/project/${projectId}`, { params })
      .then(r => { setColPhotos(r.data.data || []); setColLoading(false); })
      .catch(() => setColLoading(false));
  }, [activeId, projectId, collections.length]);

  const handleRebuild = async () => {
    setRebuilding(true);
    try {
      await api.post(`/collections/rebuild/${projectId}`);
      toast.success('Collections rebuilt');
      setActiveId(null);
      loadCollections();
    } catch { toast.error('Rebuild failed'); }
    setRebuilding(false);
  };

  const handleStar = async (photo) => {
    const next = photo.status === 'starred' ? 'analyzed' : 'starred';
    await updatePhotoStatus(photo._id, next);
    setColPhotos(ps => ps.map(p => p._id === photo._id ? { ...p, status: next } : p));
  };

  const handleReject = async (photo) => {
    await updatePhotoStatus(photo._id, 'rejected');
    setColPhotos(ps => ps.filter(p => p._id !== photo._id));
    toast.success('Photo rejected');
  };

  // ── Sidebar row ───────────────────────────────────────────────────────────
  const SidebarRow = ({ col }) => {
    const isActive = col._id === activeId;
    return (
      <button
        onClick={() => setActiveId(col._id)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
          isActive
            ? 'bg-obsidian-700 border border-obsidian-600'
            : 'hover:bg-obsidian-800/60 border border-transparent'
        }`}
      >
        <span className="text-lg leading-none flex-shrink-0">{col.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-obsidian-300 group-hover:text-white'}`}>
            {col.name}
          </p>
        </div>
        <span
          className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded-md flex-shrink-0"
          style={{ backgroundColor: col.color + '22', color: col.color }}
        >
          {col.photoCount}
        </span>
        {isActive && <ChevronRight size={13} className="text-obsidian-500 flex-shrink-0" />}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-obsidian-400 hover:text-white hover:bg-obsidian-800">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-white">Smart Collections</h1>
          <p className="text-obsidian-400 text-sm">{collections.length} collections · {collections.reduce((s, c) => s + c.photoCount, 0)} photos organized</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRebuild} isLoading={rebuilding}>
          <RefreshCw size={13} /> Rebuild
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 size={28} className="animate-spin text-gold-400" />
        </div>
      ) : collections.length === 0 ? (
        <div className="glass rounded-2xl border border-obsidian-700 p-16 text-center">
          <p className="text-4xl mb-3">📂</p>
          <p className="text-obsidian-300 font-medium mb-1">No collections yet</p>
          <p className="text-obsidian-500 text-sm mb-5">Run AI analysis first to auto-generate smart collections</p>
          <Button onClick={() => navigate(`/dashboard/projects/${projectId}/results`)}>Run AI Analysis</Button>
        </div>
      ) : (
        <div className="flex gap-4 min-h-[70vh]">
          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <div className="w-56 flex-shrink-0">
            <div className="glass rounded-2xl border border-obsidian-700 p-2 space-y-0.5 sticky top-0">
              {collections.map(col => <SidebarRow key={col._id} col={col} />)}
            </div>
          </div>

          {/* ── Photo panel ─────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {activeCol && (
              <AnimatePresence mode="wait">
                <motion.div key={activeId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                  {/* Panel header */}
                  <div className="flex items-center gap-3 glass rounded-2xl border border-obsidian-700 px-5 py-3">
                    <span className="text-2xl">{activeCol.icon}</span>
                    <div className="flex-1">
                      <h2 className="font-display text-lg font-semibold text-white">{activeCol.name}</h2>
                      <p className="text-xs text-obsidian-400">{colPhotos.length} photo{colPhotos.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeCol.color }} />
                      <span className="text-xs text-obsidian-500">{activeCol.isSystem ? 'Auto-generated' : 'Custom'}</span>
                    </div>
                  </div>

                  {/* Photos */}
                  {colLoading ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                      {Array(10).fill(0).map((_, i) => <div key={i} className="shimmer aspect-square rounded-xl" />)}
                    </div>
                  ) : colPhotos.length === 0 ? (
                    <div className="glass rounded-2xl border border-obsidian-700 p-12 text-center">
                      <span className="text-4xl block mb-3">{activeCol.icon}</span>
                      <p className="text-obsidian-400 text-sm">No photos in this collection</p>
                      <p className="text-obsidian-600 text-xs mt-1">Try rebuilding collections after analysis</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                      {colPhotos.map(photo => (
                        <PhotoCard
                          key={photo._id}
                          photo={photo}
                          isSelected={false}
                          onSelect={() => {}}
                          onStar={handleStar}
                          onReject={handleReject}
                          onClick={p => navigate(`/dashboard/photos/${p._id}`)}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
