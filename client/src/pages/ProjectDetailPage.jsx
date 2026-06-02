import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Sparkles, BookOpen, Copy, BarChart3, ArrowLeft, Star, Trash2, Grid3X3, List, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PhotoCard from '@/components/photos/PhotoCard';
import { PhotoSkeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toaster';
import { formatDate } from '@/lib/utils';
import useProjectStore from '@/store/projectStore';
import usePhotoStore from '@/store/photoStore';
import api from '@/lib/api';

const FILTERS = [
  { label:'All', value:'' }, { label:'⭐ Starred', value:'starred' },
  { label:'✅ Analyzed', value:'analyzed' }, { label:'🗑️ Rejected', value:'rejected' },
  { label:'⏳ Pending', value:'pending' },
];

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { fetchProject, currentProject } = useProjectStore();
  const { photos, fetchPhotos, isLoading, toggleSelect, selectedPhotos, clearSelection, updatePhotoStatus, bulkAction, viewMode, setViewMode } = usePhotoStore();
  const [activeFilter, setActiveFilter] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    fetchProject(projectId);
    fetchPhotos(projectId);
    return () => clearInterval(pollRef.current);
  }, [projectId]);

  useEffect(() => {
    fetchPhotos(projectId, activeFilter ? { status: activeFilter } : {});
  }, [activeFilter]);

  // Poll analysis progress when project is in 'analyzing' state
  useEffect(() => {
    if (currentProject?.status === 'analyzing') startPolling();
    else stopPolling();
  }, [currentProject?.status]);

  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/scan/status/${projectId}`);
        setAnalysisProgress(data.data);
        if (data.data.status !== 'analyzing' || data.data.percent >= 100 || data.data.pending === 0) {
          stopPolling();
          fetchProject(projectId);
          fetchPhotos(projectId);
        }
      } catch {}
    }, 2000);
  };

  const stopPolling = () => {
    clearInterval(pollRef.current);
    pollRef.current = null;
    setAnalysisProgress(null);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await api.post(`/analysis/project/${projectId}`);
      toast.success('AI analysis started!');
      startPolling();
      setTimeout(() => fetchProject(projectId), 1000);
    } catch { toast.error('Failed to start analysis'); }
    setAnalyzing(false);
  };

  const handleBulkStar = async () => { await bulkAction('star'); fetchPhotos(projectId); toast.success(`${selectedPhotos.size} photos starred`); };
  const handleBulkReject = async () => { await bulkAction('reject'); fetchPhotos(projectId); toast.success(`${selectedPhotos.size} photos rejected`); };
  const handlePhotoStar = async (photo) => { await updatePhotoStatus(photo._id, photo.status === 'starred' ? 'analyzed' : 'starred', activeFilter); };
  const handlePhotoReject = async (photo) => { await updatePhotoStatus(photo._id, 'rejected', activeFilter); };

  if (!currentProject) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full"/>
    </div>
  );

  const isAnalyzing = currentProject.status === 'analyzing';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/dashboard/projects')} className="mt-1 p-1.5 rounded-lg text-obsidian-400 hover:text-white hover:bg-obsidian-800">
          <ArrowLeft size={18}/>
        </button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-white">{currentProject.name}</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant={currentProject.status === 'ready' ? 'green' : isAnalyzing ? 'gold' : 'default'}>
              {isAnalyzing ? '⚡ Analyzing…' : currentProject.status}
            </Badge>
            <span className="text-xs text-obsidian-500">{(currentProject.totalPhotos||0).toLocaleString()} photos</span>
            {currentProject.shootDate && <span className="text-xs text-obsidian-500">{formatDate(currentProject.shootDate)}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/projects/${projectId}/upload`)}>
            <Upload size={15}/> Add Photos
          </Button>
          <Button size="sm" onClick={handleAnalyze} isLoading={analyzing || isAnalyzing}>
            <Sparkles size={15}/> {isAnalyzing ? 'Analyzing…' : 'Analyze'}
          </Button>
        </div>
      </div>

      {/* Analysis progress bar */}
      {isAnalyzing && analysisProgress && (
        <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} className="glass rounded-xl border border-gold-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gold-400 font-medium flex items-center gap-2">
              <span className="animate-pulse">⚡</span> AI analysis running in background
            </span>
            <span className="text-sm font-mono text-gold-400">{analysisProgress.percent || 0}%</span>
          </div>
          <div className="w-full bg-obsidian-700 rounded-full h-1.5 overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full"
              animate={{width:`${analysisProgress.percent || 0}%`}}/>
          </div>
          <p className="text-xs text-obsidian-500 mt-1">{analysisProgress.analyzed} / {analysisProgress.total} analyzed — you can keep working</p>
        </motion.div>
      )}

      {/* Quick nav */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: BarChart3, label: 'AI Results', to: 'results', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { icon: BookOpen, label: 'Collections', to: 'collections', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
          { icon: Copy, label: 'Duplicates', to: 'duplicates', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
          { icon: Upload, label: 'Add Photos', to: 'upload', color: 'text-gold-400', bg: 'bg-gold-500/10 border-gold-500/20' },
        ].map(item => (
          <Link key={item.label} to={`/dashboard/projects/${projectId}/${item.to}`}
            className={`glass rounded-xl border p-3 flex items-center gap-3 hover:scale-[1.02] transition-transform ${item.bg}`}>
            <item.icon size={18} className={item.color}/>
            <span className="text-sm font-medium text-white">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Filters + toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.value} onClick={() => setActiveFilter(f.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${activeFilter === f.value ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30' : 'bg-obsidian-800 text-obsidian-400 hover:text-white border border-transparent'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {selectedPhotos.size > 0 && (
            <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-xl border border-obsidian-700">
              <span className="text-xs text-obsidian-300">{selectedPhotos.size} selected</span>
              <button onClick={handleBulkStar} className="text-gold-400 hover:text-gold-300"><Star size={14}/></button>
              <button onClick={handleBulkReject} className="text-red-400 hover:text-red-300"><Trash2 size={14}/></button>
              <button onClick={clearSelection} className="text-obsidian-500 hover:text-white text-xs">✕</button>
            </div>
          )}
          <button onClick={() => fetchPhotos(projectId)} className="p-2 rounded-xl bg-obsidian-800 text-obsidian-400 hover:text-white border border-obsidian-700">
            <RefreshCw size={15}/>
          </button>
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 rounded-xl bg-obsidian-800 text-obsidian-400 hover:text-white border border-obsidian-700">
            {viewMode === 'grid' ? <List size={16}/> : <Grid3X3 size={16}/>}
          </button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="photo-grid">{Array(12).fill(0).map((_,i) => <PhotoSkeleton key={i}/>)}</div>
      ) : photos.length === 0 ? (
        <div className="glass rounded-2xl border border-obsidian-700 p-16 text-center">
          <Upload size={48} className="text-obsidian-600 mx-auto mb-4"/>
          <p className="text-obsidian-400 mb-4">No photos yet. Add your first batch.</p>
          <Button onClick={() => navigate(`/dashboard/projects/${projectId}/upload`)}>
            <Upload size={16}/> Add Photos
          </Button>
        </div>
      ) : (
        <div className="photo-grid">
          {photos.map(photo => (
            <PhotoCard key={photo._id} photo={photo}
              isSelected={selectedPhotos.has(photo._id)}
              onSelect={toggleSelect}
              onStar={handlePhotoStar}
              onReject={handlePhotoReject}
              onClick={p => navigate(`/dashboard/photos/${p._id}`)}/>
          ))}
        </div>
      )}
    </div>
  );
}
