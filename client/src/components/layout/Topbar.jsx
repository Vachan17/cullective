import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';
import { getScoreColor, getPhotoDisplayUrl } from '@/lib/utils';
import api from '@/lib/api';

const SUGGEST_PHRASES = [
  'bride smiling','group photo outdoor','sharp portrait','blurry shots',
  'closed eyes','best picks','couple photos','black and white','overexposed',
  'instagram worthy','color graded','landscape','duplicate photos',
];

export default function Topbar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = async (e) => {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    if (q.length < 1) { setResults([]); setSuggestions(SUGGEST_PHRASES.filter(p=>p.includes(q.toLowerCase())).slice(0,5)); return; }
    setSearching(true);
    try {
      const [resPhotos, resSuggest] = await Promise.all([
        api.get('/search', { params: { q, limit: 6 } }),
        api.get('/search/suggestions', { params: { q } }),
      ]);
      setResults(resPhotos.data.data.photos);
      setSuggestions(resSuggest.data.data.suggestions.length ? resSuggest.data.data.suggestions : SUGGEST_PHRASES.filter(p=>p.includes(q.toLowerCase())).slice(0,4));
    } catch { setResults([]); }
    setSearching(false);
  };

  const go = (photo) => {
    navigate(`/dashboard/photos/${photo._id}`);
    setQuery(''); setResults([]); setOpen(false);
  };

  const applySuggestion = (s) => {
    setQuery(s);
    inputRef.current?.focus();
    handleChange({ target: { value: s } });
  };

  const clearSearch = () => { setQuery(''); setResults([]); setOpen(false); };

  return (
    <header className="h-16 glass border-b border-obsidian-700/50 flex items-center gap-4 px-6 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-xl relative" ref={boxRef}>
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-obsidian-500"/>
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          placeholder='Search "bride smiling", "blurry shots", "best picks"…'
          className="w-full bg-obsidian-800/70 border border-obsidian-700 rounded-xl pl-9 pr-8 py-2 text-sm text-white placeholder:text-obsidian-600 focus:outline-none focus:ring-1 focus:ring-gold-500/40 focus:border-gold-500/40 transition-all"
        />
        {query && (
          <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-obsidian-500 hover:text-white">
            <X size={13}/>
          </button>
        )}

        {/* Dropdown */}
        <AnimatePresence>
          {open && (query.length > 0 || suggestions.length > 0) && (
            <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:4}}
              className="absolute top-full mt-2 left-0 right-0 glass rounded-xl border border-obsidian-700 z-50 overflow-hidden shadow-2xl">

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="px-3 py-2 border-b border-obsidian-700">
                  <p className="text-[10px] text-obsidian-600 uppercase tracking-widest mb-1.5">Suggestions</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.slice(0,5).map(s => (
                      <button key={s} onClick={() => applySuggestion(s)}
                        className="text-xs bg-obsidian-700 hover:bg-obsidian-600 text-obsidian-300 hover:text-white px-2 py-0.5 rounded-full transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Photo results */}
              {searching && (
                <div className="px-3 py-3 text-xs text-obsidian-500 text-center">Searching…</div>
              )}
              {!searching && results.length > 0 && (
                <div>
                  <p className="px-3 pt-2 pb-1 text-[10px] text-obsidian-600 uppercase tracking-widest">{results.length} photos found</p>
                  {results.map(photo => {
                    const sc = photo.aiScore ? getScoreColor(photo.aiScore) : '#6B7280';
                    return (
                      <button key={photo._id} onClick={() => go(photo)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-obsidian-700 transition-colors text-left">
                        <img src={photo.thumbnailUrl || getPhotoDisplayUrl(photo)} className="w-9 h-9 rounded-lg object-cover flex-shrink-0"/>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{photo.originalName}</p>
                          <div className="flex gap-1.5 mt-0.5">
                            {(photo.aiTags||[]).slice(0,2).map(t=>(
                              <span key={t} className="text-[9px] bg-obsidian-700 text-obsidian-400 px-1.5 py-0.5 rounded-full">{t}</span>
                            ))}
                          </div>
                        </div>
                        {photo.aiScore != null && (
                          <span className="text-xs font-mono font-bold flex-shrink-0" style={{color:sc}}>{photo.aiScore}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {!searching && query.length > 1 && results.length === 0 && (
                <div className="px-3 py-3 text-xs text-obsidian-500 text-center">No photos match "{query}"</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <button className="relative p-2 rounded-xl text-obsidian-400 hover:text-white hover:bg-obsidian-800 transition-colors">
          <Bell size={17}/>
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-gold-400 rounded-full"/>
        </button>
        <Button size="sm" onClick={() => navigate('/dashboard/projects')}>
          <Plus size={15}/> New Project
        </Button>
      </div>
    </header>
  );
}
