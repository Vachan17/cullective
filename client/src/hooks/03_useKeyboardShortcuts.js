/**
 * ================================================================
 * FILE: client/src/hooks/useKeyboardShortcuts.js
 * ================================================================
 * Pro culling keyboard shortcuts — like Lightroom/Capture One.
 *
 * ADD to ProjectDetailPage.jsx or PhotoDetailPage.jsx:
 *
 *   import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
 *
 *   // In ProjectDetailPage (grid view):
 *   useKeyboardShortcuts({
 *     photos,
 *     onStar:   (photo) => handlePhotoStar(photo),
 *     onReject: (photo) => handlePhotoReject(photo),
 *     onNext:   () => setFocusedIndex(i => Math.min(i+1, photos.length-1)),
 *     onPrev:   () => setFocusedIndex(i => Math.max(i-1, 0)),
 *     onOpen:   (photo) => navigate(`/dashboard/photos/${photo._id}`),
 *   });
 *
 * SHORTCUTS:
 *   P / S        → Star / Pick photo
 *   X            → Reject photo
 *   U            → Unflag (restore to analyzed)
 *   ← →          → Previous / Next photo
 *   Enter / Space → Open photo detail
 *   Ctrl+A       → Select all
 *   Escape       → Clear selection
 *   Del          → Reject all selected
 *   1–5          → Set rating (future)
 *   G            → Go to grid view
 *   D            → Go to detail view
 */

import { useEffect, useCallback } from 'react';

const useKeyboardShortcuts = ({
  photos        = [],
  focusedIndex  = 0,
  onStar,
  onReject,
  onRestore,
  onNext,
  onPrev,
  onOpen,
  onSelectAll,
  onClearSelection,
  onBulkReject,
  enabled       = true,
}) => {
  const handleKey = useCallback((e) => {
    if (!enabled) return;
    // Don't fire when typing in an input
    const tag = document.activeElement?.tagName?.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    const photo = photos[focusedIndex];

    switch (e.key.toLowerCase()) {
      case 'p':
      case 's':
        e.preventDefault();
        if (photo && onStar) onStar(photo);
        break;

      case 'x':
        e.preventDefault();
        if (photo && onReject) onReject(photo);
        break;

      case 'u':
        e.preventDefault();
        if (photo && onRestore) onRestore(photo);
        break;

      case 'arrowleft':
      case 'arrowup':
        e.preventDefault();
        onPrev?.();
        break;

      case 'arrowright':
      case 'arrowdown':
        e.preventDefault();
        onNext?.();
        break;

      case 'enter':
      case ' ':
        e.preventDefault();
        if (photo && onOpen) onOpen(photo);
        break;

      case 'escape':
        e.preventDefault();
        onClearSelection?.();
        break;

      case 'a':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onSelectAll?.();
        }
        break;

      case 'delete':
      case 'backspace':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          onBulkReject?.();
        }
        break;

      default:
        break;
    }
  }, [enabled, photos, focusedIndex, onStar, onReject, onRestore, onNext, onPrev, onOpen, onSelectAll, onClearSelection, onBulkReject]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);
};

// ── Shortcut hint overlay component (show with ? key) ────────────────────────
export const ShortcutHints = ({ visible, onClose }) => {
  if (!visible) return null;
  const hints = [
    ['P / S',      'Star / Pick photo'],
    ['X',          'Reject photo'],
    ['U',          'Restore / Unflag'],
    ['← →',        'Previous / Next'],
    ['Enter',      'Open photo detail'],
    ['Ctrl+A',     'Select all'],
    ['Escape',     'Clear selection'],
    ['Ctrl+Del',   'Reject all selected'],
  ];
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center" onClick={onClose}>
      <div className="glass rounded-2xl border border-obsidian-700 p-6 w-80" onClick={e => e.stopPropagation()}>
        <h3 className="font-display text-lg font-semibold text-white mb-4">Keyboard Shortcuts</h3>
        <div className="space-y-2">
          {hints.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-obsidian-400">{desc}</span>
              <kbd className="text-xs bg-obsidian-700 border border-obsidian-600 text-obsidian-200 px-2 py-0.5 rounded font-mono">{key}</kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-obsidian-600 mt-4 text-center">Press ? to toggle this panel</p>
      </div>
    </div>
  );
};

export default useKeyboardShortcuts;
