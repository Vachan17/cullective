import { motion } from 'framer-motion';
import { Star, Trash2, CheckCircle, AlertTriangle, Eye, Copy } from 'lucide-react';
import { cn, getScoreColor, getPhotoDisplayUrl } from '@/lib/utils';

export default function PhotoCard({ photo, isSelected, onSelect, onStar, onReject, onClick }) {
  const score      = photo.aiScore;
  const scoreColor = score != null ? getScoreColor(score) : '#6B7280';
  const a          = photo.analysis || {};

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'relative group rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-150',
        isSelected ? 'border-gold-400 ring-2 ring-gold-400/30' : 'border-transparent hover:border-obsidian-600'
      )}
      onClick={() => onClick?.(photo)}
    >
      <div className="aspect-square bg-obsidian-800 relative overflow-hidden">
        <img
          src={photo.thumbnailUrl || getPhotoDisplayUrl(photo)}
          alt={photo.originalName}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        {/* Status overlays */}
        {photo.status === 'rejected' && (
          <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center z-10">
            <Trash2 size={22} className="text-red-300" />
          </div>
        )}

        {/* Corner actions (top right) */}
        <div className="absolute top-1.5 right-1.5 flex gap-1.5 z-10">
          {photo.status === 'starred' && (
            <div className="group-hover:hidden w-6 h-6 rounded-lg bg-obsidian-950/80 backdrop-blur flex items-center justify-center border border-gold-500/20">
              <Star size={12} className="text-gold-400 fill-gold-400" />
            </div>
          )}

          <div className="hidden group-hover:flex items-center gap-1 bg-obsidian-950/85 backdrop-blur p-0.5 rounded-lg border border-obsidian-700/50">
            <button
              onClick={e => { e.stopPropagation(); onSelect?.(photo._id); }}
              className={cn(
                'w-6 h-6 rounded-md border flex items-center justify-center transition-all flex-shrink-0',
                isSelected ? 'bg-gold-400 border-gold-400 text-obsidian-900' : 'border-white/40 hover:border-gold-400 text-white'
              )}
            >
              {isSelected ? <CheckCircle size={11} className="text-obsidian-900 fill-obsidian-900" /> : <div className="w-2.5 h-2.5" />}
            </button>
            <button
              onClick={e => { e.stopPropagation(); onStar?.(photo); }}
              className={cn(
                'w-6 h-6 rounded-md flex items-center justify-center transition-colors flex-shrink-0',
                photo.status === 'starred' ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30' : 'hover:bg-obsidian-800 border border-transparent text-obsidian-400 hover:text-white'
              )}
            >
              <Star size={12} className={photo.status === 'starred' ? 'fill-gold-400 text-gold-400' : ''} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onReject?.(photo); }}
              className="w-6 h-6 rounded-md hover:bg-red-500/20 text-obsidian-400 hover:text-red-400 border border-transparent flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Analysis badges — top left */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
          {a.isBlurry && (
            <span className="bg-orange-500/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <AlertTriangle size={7} />BLUR
            </span>
          )}
          {a.eyesOpen === false && (
            <span className="bg-red-500/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Eye size={7} />EYES
            </span>
          )}
          {a.isDuplicate && (
            <span className="bg-purple-500/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Copy size={7} />DUP
            </span>
          )}
          {(a.isUnderexposed || a.isOverexposed) && (
            <span className={`text-white text-[8px] font-bold px-1.5 py-0.5 rounded ${a.isUnderexposed ? 'bg-blue-500/90' : 'bg-yellow-500/90 text-obsidian-900'}`}>
              {a.isUnderexposed ? 'DARK' : 'BRIGHT'}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-2 py-1.5 bg-obsidian-900">
        <div className="flex items-center justify-between gap-1">
          <p className="text-[11px] text-obsidian-400 truncate flex-1">{photo.originalName}</p>
          {score != null && (
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-[10px] flex-shrink-0 text-obsidian-900"
              style={{ backgroundColor: scoreColor }}
            >
              {score}
            </div>
          )}
        </div>
        {photo.aiTags?.length > 0 && (
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {photo.aiTags.filter(t => !['best-pick','instagram-worthy'].includes(t)).slice(0, 2).map(tag => (
              <span key={tag} className="text-[8px] bg-obsidian-700 text-obsidian-400 px-1 py-px rounded-full">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
