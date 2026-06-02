/**
 * ================================================================
 * FILE: client/src/components/layout/LiveAnalysisDrawer.jsx
 * ================================================================
 * Persistent bottom drawer showing live analysis progress
 * for ALL projects currently being analyzed.
 * Replaces the per-page polling — works globally.
 *
 * ADD to client/src/components/layout/DashboardLayout.jsx:
 *
 *   import LiveAnalysisDrawer from './LiveAnalysisDrawer';
 *   // Inside the return, after <main>:
 *   <LiveAnalysisDrawer />
 *
 * This auto-shows when any project is analyzing and auto-hides when done.
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import api from '@/lib/api';
import useProjectStore from '@/store/projectStore';

export default function LiveAnalysisDrawer() {
  const { projects, fetchProjects } = useProjectStore();
  const [jobs, setJobs]       = useState({});   // { projectId: { status, percent, analyzed, total } }
  const [minimized, setMin]   = useState(false);
  const pollRef = useRef(null);
  const navigate = useNavigate();

  const analyzingProjects = projects.filter(p => p.status === 'analyzing');

  useEffect(() => {
    if (analyzingProjects.length === 0) {
      clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }

    const poll = async () => {
      for (const proj of analyzingProjects) {
        try {
          const { data } = await api.get(`/scan/status/${proj._id}`);
          const s = data.data;
          setJobs(prev => ({ ...prev, [proj._id]: { ...s, name: proj.name } }));

          // If just completed, refresh projects list
          if (s.status === 'ready') {
            setJobs(prev => {
              const next = { ...prev };
              delete next[proj._id];
              return next;
            });
            fetchProjects();
          }
        } catch {}
      }
    };

    poll();
    if (!pollRef.current) pollRef.current = setInterval(poll, 2500);
    return () => { clearInterval(pollRef.current); pollRef.current = null; };
  }, [analyzingProjects.length]);

  const activeJobs = Object.entries(jobs).filter(([, j]) => j.status === 'analyzing');

  if (activeJobs.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4"
      >
        <div className="glass rounded-2xl border border-gold-500/30 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-obsidian-700">
            <div className="w-6 h-6 rounded-full bg-gold-500/20 border border-gold-500/40 flex items-center justify-center flex-shrink-0">
              <Sparkles size={12} className="text-gold-400 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-white flex-1">
              AI Analysis Running
              <span className="text-obsidian-400 font-normal ml-1">
                · {activeJobs.length} project{activeJobs.length > 1 ? 's' : ''}
              </span>
            </p>
            <button onClick={() => setMin(m => !m)} className="text-obsidian-500 hover:text-white p-1">
              {minimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {/* Jobs list */}
          <AnimatePresence>
            {!minimized && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                className="overflow-hidden">
                <div className="px-4 py-3 space-y-3">
                  {activeJobs.map(([id, job]) => (
                    <div key={id} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => navigate(`/dashboard/projects/${id}/results`)}
                          className="text-xs text-white hover:text-gold-400 transition-colors font-medium truncate max-w-[200px]"
                        >
                          {job.name}
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gold-400">{job.percent || 0}%</span>
                          <span className="text-[10px] text-obsidian-500">{job.analyzed}/{job.total}</span>
                        </div>
                      </div>
                      <div className="w-full bg-obsidian-700 rounded-full h-1.5 overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full"
                          animate={{ width: `${job.percent || 0}%` }}
                          transition={{ ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-obsidian-600 text-center pt-1">
                    You can keep working — analysis runs in the background
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
