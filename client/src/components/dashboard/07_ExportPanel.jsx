/**
 * ================================================================
 * FILE: client/src/components/dashboard/ExportPanel.jsx
 * ================================================================
 * Export buttons for CSV, JSON, XMP and Best Picks.
 * Drop this into AIResultsPage.jsx at the bottom.
 *
 * USAGE:
 *   import ExportPanel from '@/components/dashboard/ExportPanel';
 *   <ExportPanel projectId={projectId} projectName={data?.project?.name} />
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, FileJson, Star, Layers } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from '@/components/ui/Toaster';
import api from '@/lib/api';

const downloadBlob = (content, filename, type = 'text/plain') => {
  const blob = new Blob([content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function ExportPanel({ projectId, projectName = 'project' }) {
  const [loading, setLoading] = useState({});

  const setLoad = (key, val) => setLoading(l => ({ ...l, [key]: val }));
  const safeName = projectName.replace(/[^a-z0-9]/gi, '_');

  const handleCSV = async () => {
    setLoad('csv', true);
    try {
      const res = await api.get(`/export/${projectId}/csv`, { responseType: 'blob' });
      downloadBlob(res.data, `${safeName}_analysis.csv`, 'text/csv');
      toast.success('CSV downloaded');
    } catch { toast.error('CSV export failed'); }
    setLoad('csv', false);
  };

  const handleJSON = async () => {
    setLoad('json', true);
    try {
      const res = await api.get(`/export/${projectId}/json`, { responseType: 'blob' });
      downloadBlob(res.data, `${safeName}_export.json`, 'application/json');
      toast.success('JSON downloaded');
    } catch { toast.error('JSON export failed'); }
    setLoad('json', false);
  };

  const handleBestPicks = async () => {
    setLoad('best', true);
    try {
      const res = await api.get(`/export/${projectId}/best-picks`, { responseType: 'blob' });
      downloadBlob(res.data, `${safeName}_best_picks.txt`);
      toast.success('Best picks list downloaded');
    } catch { toast.error('Export failed'); }
    setLoad('best', false);
  };

  const handleXMP = async () => {
    setLoad('xmp', true);
    try {
      const { data } = await api.get(`/export/${projectId}/xmp`);
      const files = data.data?.files || [];
      if (!files.length) { toast.error('No photos to export'); return; }

      // Download each XMP as a separate file
      files.forEach((f, i) => {
        setTimeout(() => downloadBlob(f.content, f.name, 'application/rdf+xml'), i * 60);
      });

      toast.success(`${files.length} XMP sidecar files downloaded — place them next to your originals`);
    } catch { toast.error('XMP export failed'); }
    setLoad('xmp', false);
  };

  const options = [
    {
      key:     'csv',
      icon:    FileText,
      label:   'Export CSV',
      desc:    'Full analysis data — open in Excel / Sheets',
      color:   'text-green-400',
      bg:      'bg-green-500/10 border-green-500/20',
      handler: handleCSV,
    },
    {
      key:     'json',
      icon:    FileJson,
      label:   'Export JSON',
      desc:    'Structured data for developers',
      color:   'text-blue-400',
      bg:      'bg-blue-500/10 border-blue-500/20',
      handler: handleJSON,
    },
    {
      key:     'xmp',
      icon:    Layers,
      label:   'Lightroom XMP',
      desc:    'AI ratings/labels → Lightroom Classic',
      color:   'text-purple-400',
      bg:      'bg-purple-500/10 border-purple-500/20',
      handler: handleXMP,
    },
    {
      key:     'best',
      icon:    Star,
      label:   'Best Picks List',
      desc:    'Score + URL of top photos only',
      color:   'text-gold-400',
      bg:      'bg-gold-500/10 border-gold-500/20',
      handler: handleBestPicks,
    },
  ];

  return (
    <div className="glass rounded-2xl border border-obsidian-700 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Download size={16} className="text-gold-400" />
        <h3 className="font-semibold text-white">Export Results</h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt, i) => (
          <motion.button
            key={opt.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={opt.handler}
            disabled={loading[opt.key]}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all disabled:opacity-50 ${opt.bg}`}
          >
            {loading[opt.key]
              ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
              : <opt.icon size={18} className={`${opt.color} flex-shrink-0 mt-0.5`} />
            }
            <div>
              <p className="text-sm font-medium text-white">{opt.label}</p>
              <p className="text-[11px] text-obsidian-400 mt-0.5">{opt.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
