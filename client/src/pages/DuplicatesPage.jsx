import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Trash2, ChevronDown, ChevronUp, ArrowLeftRight, CheckCircle, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from '@/components/ui/Toaster';
import { getScoreColor, formatBytes, getPhotoDisplayUrl } from '@/lib/utils';
import api from '@/lib/api';

// ── Side-by-side compare modal ────────────────────────────────────────────────
function CompareModal({ photos, bestId, onClose, onKeep }) {
  const [selected, setSelected] = useState(bestId);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-obsidian-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <ArrowLeftRight size={18} className="text-gold-400"/>
          <h2 className="font-display text-lg text-white">Compare {photos.length} Similar Photos</h2>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" onClick={() => onKeep(selected)} disabled={!selected}>
            <CheckCircle size={14}/> Keep Selected &amp; Reject Others
          </Button>
          <button onClick={onClose} className="p-2 rounded-lg text-obsidian-400 hover:text-white hover:bg-obsidian-700">
            <X size={18}/>
          </button>
        </div>
      </div>

      {/* Photo grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className={`grid gap-4 h-full ${photos.length === 2 ? 'grid-cols-2' : photos.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'}`}>
          {photos.map(photo => {
            const sc = photo.aiScore ? getScoreColor(photo.aiScore) : '#6B7280';
            const isChosen = selected === photo._id;
            const isBest = photo._id === bestId;
            const imageSrc = photo.thumbnailUrl || getPhotoDisplayUrl(photo);
            return (
              <motion.div
                key={photo._id}
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelected(photo._id)}
                className={`relative rounded-2xl overflow-hidden cursor-pointer border-2 transition-all flex flex-col ${isChosen ? 'border-gold-400 ring-2 ring-gold-400/30' : 'border-obsidian-700 hover:border-obsidian-500'}`}
              >
                {/* Image */}
                <div className="flex-1 relative bg-obsidian-900 min-h-0">
                  <img src={imageSrc} alt={photo.originalName}
                    className="w-full h-full object-contain max-h-[55vh]"/>
                  {isBest && (
                    <div className="absolute top-3 left-3 bg-gold-400 text-obsidian-900 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                      <Star size={9} className="fill-obsidian-900"/> AI BEST PICK
                    </div>
                  )}
                  {isChosen && (
                    <div className="absolute top-3 right-3 w-7 h-7 bg-gold-400 rounded-full flex items-center justify-center">
                      <CheckCircle size={15} className="text-obsidian-900"/>
                    </div>
                  )}
                </div>

                {/* Stats bar */}
                <div className="bg-obsidian-900 border-t border-obsidian-700 px-3 py-2.5 flex items-center gap-2 flex-shrink-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium truncate">{photo.originalName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {photo.analysis?.sharpness && (
                        <span className="text-[10px] text-obsidian-400">Sharp: {photo.analysis.sharpness.score}%</span>
                      )}
                      {photo.analysis?.exposure && (
                        <span className="text-[10px] text-obsidian-400">· {photo.analysis.exposure.label}</span>
                      )}
                      {photo.fileSize && (
                        <span className="text-[10px] text-obsidian-600">· {formatBytes(photo.fileSize)}</span>
                      )}
                    </div>
                  </div>
                  {photo.aiScore != null && (
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: sc + '22', border: `1.5px solid ${sc}60`, color: sc }}>
                      {photo.aiScore}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DuplicatesPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [compareGroup, setCompareGroup] = useState(null);

  useEffect(() => {
    api.get(`/analysis/duplicates/${projectId}`)
      .then(r => { setGroups(r.data.data.duplicateGroups); setLoading(false); })
      .catch(() => setLoading(false));
  }, [projectId]);

  const keepBest = async (group, keepId = null) => {
    const idToKeep = keepId || group.bestPhoto._id;
    const toReject = group.photos.filter(p => p._id !== idToKeep).map(p => p._id);
    await api.post('/photos/bulk', { photoIds: toReject, action: 'reject' });
    toast.success(`Kept 1, rejected ${toReject.length} duplicate${toReject.length > 1 ? 's' : ''}`);
    setGroups(g => g.filter(gr => gr.groupId !== group.groupId));
    setCompareGroup(null);
  };

  const handleCompareKeep = (selectedId) => {
    const group = groups.find(g => g.photos.some(p => p._id === selectedId));
    if (group) keepBest(group, selectedId);
  };

  const rejectAll = async (group) => {
    await api.post('/photos/bulk', { photoIds: group.photos.map(p => p._id), action: 'reject' });
    toast.success(`Rejected all ${group.count} photos in group`);
    setGroups(g => g.filter(gr => gr.groupId !== group.groupId));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full"/>
    </div>
  );

  return (
    <>
      {/* Compare modal */}
      <AnimatePresence>
        {compareGroup && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <CompareModal
              photos={compareGroup.photos}
              bestId={compareGroup.bestPhoto._id}
              onClose={() => setCompareGroup(null)}
              onKeep={handleCompareKeep}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-obsidian-400 hover:text-white hover:bg-obsidian-800">
            <ArrowLeft size={18}/>
          </button>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-white">Duplicate Groups</h1>
            <p className="text-obsidian-400 text-sm">
              {groups.length} group{groups.length !== 1 ? 's' : ''} · {groups.reduce((s,g)=>s+g.count,0)} similar photos found
            </p>
          </div>
          {groups.length > 0 && (
            <Button variant="danger" size="sm" onClick={async () => {
              for (const g of groups) await keepBest(g);
              toast.success('Kept best pick from every group');
            }}>
              <Star size={14}/> Keep All Best Picks
            </Button>
          )}
        </div>

        {groups.length === 0 ? (
          <div className="glass rounded-2xl border border-obsidian-700 p-16 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <p className="text-obsidian-300 font-semibold mb-1">No duplicates found!</p>
            <p className="text-obsidian-500 text-sm">All photos in this project are unique.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group, i) => (
              <motion.div key={group.groupId} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}
                className="glass rounded-2xl border border-obsidian-700 overflow-hidden">
                {/* Group header */}
                <div className="flex items-center gap-4 p-4">
                  <div className="relative flex-shrink-0">
                    <img src={group.bestPhoto.thumbnailUrl || getPhotoDisplayUrl(group.bestPhoto)}
                      className="w-16 h-16 rounded-xl object-cover border-2 border-gold-400/50"/>
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gold-400 rounded-full flex items-center justify-center">
                      <Star size={9} className="text-obsidian-900 fill-obsidian-900"/>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">{group.bestPhoto.originalName}</p>
                    <p className="text-xs text-obsidian-400">{group.count} similar photos in this group</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full">⭐ Best suggested</span>
                      {group.bestPhoto.aiScore && (
                        <span className="text-xs font-mono font-semibold"
                          style={{color: getScoreColor(group.bestPhoto.aiScore)}}>
                          Score: {group.bestPhoto.aiScore}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Compare button */}
                    <Button size="sm" variant="secondary" onClick={() => setCompareGroup(group)}>
                      <ArrowLeftRight size={13}/> Compare
                    </Button>
                    {/* Keep best */}
                    <Button size="sm" variant="outline" onClick={() => keepBest(group)}>
                      <Star size={13}/> Keep Best
                    </Button>
                    {/* Reject all */}
                    <button onClick={() => rejectAll(group)}
                      className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors">
                      <Trash2 size={14}/>
                    </button>
                    {/* Expand */}
                    <button onClick={() => setExpanded(e => ({...e, [group.groupId]: !e[group.groupId]}))}
                      className="p-2 rounded-xl bg-obsidian-700 text-obsidian-400 hover:text-white transition-colors">
                      {expanded[group.groupId] ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
                    </button>
                  </div>
                </div>

                {/* Expanded thumbnail strip */}
                <AnimatePresence>
                  {expanded[group.groupId] && (
                    <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
                      className="border-t border-obsidian-700 overflow-hidden">
                      <div className="p-4">
                        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                          {group.photos.map(photo => {
                            const sc = photo.aiScore ? getScoreColor(photo.aiScore) : '#6B7280';
                            const isBest = photo._id === group.bestPhoto._id;
                            return (
                              <div key={photo._id}
                                className={`relative rounded-xl overflow-hidden aspect-square border-2 cursor-pointer group ${isBest ? 'border-gold-400' : 'border-obsidian-700 hover:border-obsidian-500'}`}
                                onClick={() => setCompareGroup({ ...group, photos: [photo, group.bestPhoto].filter((p,i,a)=>a.findIndex(x=>x._id===p._id)===i) })}>
                                <img src={photo.thumbnailUrl || getPhotoDisplayUrl(photo)} className="w-full h-full object-cover"/>
                                {photo.aiScore != null && (
                                  <div className="absolute bottom-0.5 right-0.5 text-[9px] font-bold font-mono px-1 rounded"
                                    style={{backgroundColor:sc,color:'#111'}}>{photo.aiScore}</div>
                                )}
                                {isBest && (
                                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-gold-400 rounded-full flex items-center justify-center">
                                    <Star size={7} className="fill-obsidian-900 text-obsidian-900"/>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-obsidian-600 mt-2">Click any thumbnail to compare it with the best pick side-by-side</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
