import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Trash2, CheckCircle, XCircle, AlertTriangle, Cloud } from 'lucide-react';
import Button from '@/components/ui/Button';
import AdobeButtons from '@/components/photos/AdobeButtons';
import { toast } from '@/components/ui/Toaster';
import { getScoreColor, getScoreLabel, formatBytes, getPhotoDisplayUrl } from '@/lib/utils';
import api from '@/lib/api';

const MetricRow = ({ label, value, good }) => (
  <div className="flex items-center justify-between py-2 border-b border-obsidian-800 last:border-0">
    <span className="text-sm text-obsidian-400">{label}</span>
    <div className="flex items-center gap-2">
      <span className="text-sm text-white font-medium">{value}</span>
      {good !== undefined && (good
        ? <CheckCircle size={13} className="text-green-400" />
        : <XCircle size={13} className="text-red-400" />)}
    </div>
  </div>
);

const ScoreBar = ({ label, score, color }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-obsidian-400">{label}</span>
      <span className="font-mono text-obsidian-200">{score}</span>
    </div>
    <div className="w-full bg-obsidian-700 rounded-full h-1.5 overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: `${score}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={`h-full rounded-full ${color}`} />
    </div>
  </div>
);

export default function PhotoDetailPage() {
  const { photoId } = useParams();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/photos/${photoId}`)
      .then(r => { setPhoto(r.data.data.photo); setLoading(false); })
      .catch(() => setLoading(false));
  }, [photoId]);

  const handleStatus = async (status) => {
    await api.put(`/photos/${photoId}/status`, { status });
    setPhoto(p => ({ ...p, status }));
    toast.success(`Photo ${status}`);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full" />
    </div>
  );
  if (!photo) return <div className="text-center text-obsidian-400 p-16">Photo not found</div>;

  const a = photo.analysis || {};
  const sc = photo.aiScore ? getScoreColor(photo.aiScore) : '#6B7280';
  const usedCloudinary = a.analyzedWith?.includes('cloudinary');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-obsidian-400 hover:text-white hover:bg-obsidian-800">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold text-white truncate">{photo.originalName}</h1>
          <p className="text-obsidian-400 text-sm">
            {photo.width && photo.height ? `${photo.width}×${photo.height} · ` : ''}
            {photo.fileSize ? `${formatBytes(photo.fileSize)} · ` : ''}
            {photo.format?.toUpperCase()}
            {usedCloudinary && <span className="ml-2 text-[10px] bg-gold-500/20 text-gold-400 px-1.5 py-0.5 rounded-full border border-gold-500/30"><Cloud size={8} className="inline mr-0.5" />Cloudinary AI</span>}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-nowrap">
          <Button size="sm" variant={photo.status === 'starred' ? 'default' : 'outline'}
            onClick={() => handleStatus(photo.status === 'starred' ? 'analyzed' : 'starred')}>
            <Star size={13} className={photo.status === 'starred' ? 'fill-obsidian-900' : ''} />
            {photo.status === 'starred' ? 'Starred' : 'Star'}
          </Button>
          <Button size="sm" variant="danger" onClick={() => handleStatus('rejected')}>
            <Trash2 size={13} /> Reject
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Image */}
        <div className="lg:col-span-3 space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-obsidian-900 border border-obsidian-700">
            <img src={getPhotoDisplayUrl(photo)} alt={photo.originalName} className="w-full object-contain max-h-[65vh]" />
            {photo.aiScore != null && (
              <div className="absolute top-4 right-4 w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2"
                style={{ backgroundColor: `${sc}22`, borderColor: `${sc}60` }}>
                <span className="text-lg font-bold font-mono" style={{ color: sc }}>{photo.aiScore}</span>
                <span className="text-[9px] text-obsidian-400">/100</span>
              </div>
            )}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5">
              {a.isBlurry         && <span className="bg-orange-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">💧 BLUR</span>}
              {a.isUnderexposed   && <span className="bg-blue-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">🌑 DARK</span>}
              {a.isOverexposed    && <span className="bg-yellow-500/90 text-obsidian-900 text-[10px] font-bold px-2 py-0.5 rounded-lg">☀️ BRIGHT</span>}
              {a.eyesOpen === false && <span className="bg-red-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">😑 EYES</span>}
              {a.isWedding        && <span className="bg-pink-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">💍 WEDDING</span>}
              {a.isNight          && <span className="bg-indigo-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">🌙 NIGHT</span>}
            </div>
          </div>
          <AdobeButtons photo={photo} />
        </div>

        {/* Analysis */}
        <div className="lg:col-span-2 space-y-4">
          {/* Score */}
          <div className="glass rounded-2xl border border-obsidian-700 p-5">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-semibold text-white">AI Score</h3>
              {usedCloudinary && (
                <span className="text-[10px] bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full border border-gold-500/30 flex items-center gap-1">
                  <Cloud size={8} /> Cloudinary AI
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center border-2 flex-shrink-0"
                style={{ backgroundColor: `${sc}20`, borderColor: `${sc}50` }}>
                <span className="text-xl font-bold font-mono" style={{ color: sc }}>{photo.aiScore || '?'}</span>
              </div>
              <div>
                <p className="font-semibold text-white">{photo.aiScore ? getScoreLabel(photo.aiScore) : 'Not analyzed'}</p>
                <p className="text-xs text-obsidian-400 mt-0.5">Confidence: {a.confidence || 0}%</p>
              </div>
            </div>
            <div className="space-y-2.5">
              <ScoreBar label="Sharpness"    score={a.sharpness?.score || 0}   color="bg-blue-400" />
              <ScoreBar label="Exposure"     score={a.exposure?.score  || 0}   color="bg-gold-400" />
              <ScoreBar label="Noise Quality"score={a.noise?.score     || 0}   color="bg-green-400" />
              <ScoreBar label="Quality Score"score={a.composition?.score|| 0}  color="bg-purple-400" />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-4">
              {(photo.aiTags || []).map(tag => (
                <span key={tag} className="text-[10px] bg-obsidian-700 text-obsidian-300 px-2 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
          </div>

          {/* Scene tags from Cloudinary */}
          {a.sceneTags?.length > 0 && (
            <div className="glass rounded-2xl border border-obsidian-700 p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Cloud size={14} className="text-gold-400" /> Scene Understanding
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {a.sceneTags.map(tag => (
                  <span key={tag} className="text-xs bg-gold-500/15 text-gold-400 border border-gold-500/25 px-2.5 py-1 rounded-full capitalize">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Detected properties */}
          <div className="glass rounded-2xl border border-obsidian-700 p-5">
            <h3 className="font-semibold text-white mb-3">Detected Properties</h3>
            <MetricRow label="Sharpness"     value={`${a.sharpness?.score||0}% — ${a.sharpness?.label||'?'}`}  good={!a.isBlurry} />
            <MetricRow label="Exposure"      value={a.exposure?.label || 'Unknown'}   good={!a.isUnderexposed && !a.isOverexposed} />
            <MetricRow label="Noise Level"   value={`${a.noise?.score||0}% — ${a.noise?.label||'?'}`}         good={!a.noise?.isNoisy} />
            <MetricRow label="Quality"       value={a.composition?.label || '?'} />
            <MetricRow label="Faces"         value={a.faceCount != null ? `${a.faceCount} detected` : 'N/A'} />
            {a.faceCount > 0 && <MetricRow label="Eyes Open" value={a.eyesOpen === null ? 'Unknown' : a.eyesOpen ? 'Yes ✓' : 'No — Closed'} good={a.eyesOpen !== false} />}
            <MetricRow label="Type"          value={a.isGroupPhoto ? 'Group Photo' : a.isCouplePhoto ? 'Couple' : a.isPortrait ? 'Portrait' : a.isLandscape ? 'Landscape' : 'General'} />
            <MetricRow label="Color"         value={a.isBlackAndWhite ? 'Black & White' : a.isColorGraded ? 'Color Graded' : 'Natural'} />
            {a.isWedding && <MetricRow label="Scene" value="Wedding" />}
            {a.isNight   && <MetricRow label="Lighting" value="Night / Low Light" />}
            <MetricRow label="Duplicate"     value={a.isDuplicate ? 'Yes — similar found' : 'No'} good={!a.isDuplicate} />
          </div>

          {/* Recommendations */}
          {a.recommendations?.length > 0 && (
            <div className="glass rounded-2xl border border-gold-500/20 p-5">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <AlertTriangle size={14} className="text-gold-400" /> Editing Suggestions
              </h3>
              {a.recommendations.map((rec, i) => (
                <div key={i} className={`mb-3 last:mb-0 pb-3 last:pb-0 ${i < a.recommendations.length - 1 ? 'border-b border-obsidian-700' : ''}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${rec.severity === 'high' ? 'bg-red-500/20 text-red-400' : rec.severity === 'medium' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {rec.severity}
                    </span>
                    <p className="text-sm font-medium text-gold-400">{rec.issue}</p>
                  </div>
                  <p className="text-xs text-obsidian-400 mb-2">{rec.suggestedFix}</p>
                  {rec.params && Object.keys(rec.params).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(rec.params).map(([k, v]) => (
                        <span key={k} className="text-[10px] font-mono bg-obsidian-700 border border-obsidian-600 px-2 py-0.5 rounded">
                          {k}: <span className="text-gold-400">{v}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Dominant colors */}
          {a.dominantColors?.length > 0 && (
            <div className="glass rounded-2xl border border-obsidian-700 p-5">
              <h3 className="font-semibold text-white mb-3">Dominant Colors</h3>
              <div className="flex gap-2">
                {a.dominantColors.map((c, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="w-9 h-9 rounded-xl border border-obsidian-600 shadow-inner" style={{ backgroundColor: c.color }} />
                    <span className="text-[9px] text-obsidian-500 font-mono">{c.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
