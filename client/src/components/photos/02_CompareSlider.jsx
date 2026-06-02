/**
 * ================================================================
 * FILE: client/src/components/photos/CompareSlider.jsx
 * ================================================================
 * Drag-divider side-by-side photo comparison.
 * Works for any two photos — used in DuplicatesPage compare modal.
 *
 * USAGE:
 *   import CompareSlider from '@/components/photos/CompareSlider';
 *   <CompareSlider leftPhoto={photoA} rightPhoto={photoB} />
 */

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { getScoreColor } from '@/lib/utils';

export default function CompareSlider({ leftPhoto, rightPhoto }) {
  const [position, setPosition]   = useState(50); // 0–100 %
  const [dragging, setDragging]   = useState(false);
  const containerRef = useRef(null);

  const getPercent = useCallback((clientX) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 50;
    return Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
  }, []);

  const onMouseDown = (e) => { e.preventDefault(); setDragging(true); };
  const onMouseMove = (e) => { if (dragging) setPosition(getPercent(e.clientX)); };
  const onMouseUp   = ()  => setDragging(false);
  const onTouchMove = (e) => setPosition(getPercent(e.touches[0].clientX));

  const ScoreBadge = ({ photo, side }) => {
    const sc = photo?.aiScore;
    const color = sc ? getScoreColor(sc) : '#6B7280';
    return (
      <div className={`absolute top-3 ${side === 'left' ? 'left-3' : 'right-3'} flex flex-col gap-1.5 z-10`}>
        {sc != null && (
          <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center border-2 shadow-lg"
            style={{ backgroundColor: `${color}22`, borderColor: `${color}60` }}>
            <span className="text-sm font-bold font-mono" style={{ color }}>{sc}</span>
          </div>
        )}
        <div className="bg-obsidian-900/80 backdrop-blur rounded-lg px-2 py-1 text-[10px] text-white font-medium max-w-[120px] truncate">
          {photo?.originalName}
        </div>
        {photo?.analysis?.sharpness && (
          <div className="bg-obsidian-900/80 backdrop-blur rounded-lg px-2 py-1 text-[10px] text-obsidian-300">
            Sharp: {photo.analysis.sharpness.score}% · {photo.analysis.exposure?.label}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden rounded-xl bg-obsidian-950 cursor-col-resize"
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchMove={onTouchMove}
      onTouchEnd={onMouseUp}
    >
      {/* Right photo — full width base layer */}
      <div className="absolute inset-0">
        <img
          src={rightPhoto?.url || rightPhoto?.thumbnailUrl}
          className="w-full h-full object-contain"
          alt="right"
          draggable={false}
        />
        <ScoreBadge photo={rightPhoto} side="right" />
        <div className="absolute bottom-3 right-3 bg-obsidian-900/80 backdrop-blur rounded-lg px-2 py-1 text-[10px] text-obsidian-300">
          B
        </div>
      </div>

      {/* Left photo — clipped by slider position */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img
          src={leftPhoto?.url || leftPhoto?.thumbnailUrl}
          className="absolute top-0 left-0 h-full object-contain"
          style={{ width: `${100 / (position / 100)}%`, maxWidth: 'none' }}
          alt="left"
          draggable={false}
        />
        <ScoreBadge photo={leftPhoto} side="left" />
        <div className="absolute bottom-3 left-3 bg-obsidian-900/80 backdrop-blur rounded-lg px-2 py-1 text-[10px] text-obsidian-300">
          A
        </div>
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-20 pointer-events-none"
        style={{ left: `${position}%` }}
      />

      {/* Drag handle */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30 cursor-col-resize"
        style={{ left: `${position}%` }}
        onMouseDown={onMouseDown}
        onTouchStart={(e) => { setDragging(true); setPosition(getPercent(e.touches[0].clientX)); }}
      >
        <motion.div
          animate={{ scale: dragging ? 1.15 : 1 }}
          className="w-9 h-9 rounded-full bg-white shadow-xl flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6 4L2 9L6 14M12 4L16 9L12 14" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="bg-obsidian-900/70 backdrop-blur rounded-full px-3 py-1 text-[10px] text-obsidian-300">
          ← drag to compare →
        </div>
      </div>
    </div>
  );
}
