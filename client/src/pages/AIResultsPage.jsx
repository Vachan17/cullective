import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, RefreshCw, Copy, Sparkles, CheckCircle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { toast } from '@/components/ui/Toaster';
import api from '@/lib/api';

const PIE_COLORS = ['#10B981','#F59E0B','#F97316','#EF4444','#8B5CF6'];

const StatTile = ({ icon, label, value, color = 'text-white', sub }) => (
  <div className="glass rounded-xl border border-obsidian-700 p-4">
    <div className="text-2xl mb-1">{icon}</div>
    <div className={`text-2xl font-bold font-mono ${color}`}>{value}</div>
    <div className="text-xs text-obsidian-400 mt-0.5">{label}</div>
    {sub && <div className="text-[10px] text-obsidian-600 mt-0.5">{sub}</div>}
  </div>
);

const MetricBar = ({ label, value, max, color = 'bg-gold-400', pct }) => {
  const percent = pct !== undefined ? pct : (max > 0 ? Math.round((value / max) * 100) : 0);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-obsidian-400">{label}</span>
        <span className="font-mono text-obsidian-200">{value} <span className="text-obsidian-600">({percent}%)</span></span>
      </div>
      <div className="w-full bg-obsidian-700 rounded-full h-1.5 overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`} />
      </div>
    </div>
  );
};

export default function AIResultsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/analysis/results/${projectId}`)
      .then(r => { setData(r.data.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [projectId]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await api.post(`/analysis/project/${projectId}`);
      toast.success('AI analysis started — using Cloudinary AI + Sharp');
      setTimeout(load, 4000);
    } catch (e) { toast.error(e.message || 'Failed to start'); }
    setAnalyzing(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full" />
    </div>
  );

  const s = data?.summary || {};
  const prog = data?.progress || {};
  const analyzed = s.analyzed || 0;
  const total = s.total || 1;

  const pieData = [
    { name: 'Best Picks',   value: s.bestPicks    || 0 },
    { name: 'Good',         value: Math.max(0, analyzed - (s.bestPicks||0) - (s.blurry||0) - (s.duplicates||0) - (s.closedEyes||0)) },
    { name: 'Blurry',       value: s.blurry       || 0 },
    { name: 'Duplicates',   value: s.duplicates   || 0 },
    { name: 'Closed Eyes',  value: s.closedEyes   || 0 },
  ].filter(d => d.value > 0);

  const typeBarData = [
    { name: 'Portraits',    count: s.portraits    || 0 },
    { name: 'Couples',      count: s.couples      || 0 },
    { name: 'Groups',       count: s.groups       || 0 },
    { name: 'Landscapes',   count: s.landscapes   || 0 },
    { name: 'B&W',          count: s.blackAndWhite|| 0 },
    { name: 'Graded',       count: s.colorGraded  || 0 },
    { name: 'Wedding',      count: s.wedding      || 0 },
    { name: 'Night',        count: s.nightShots   || 0 },
  ].filter(d => d.count > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-obsidian-400 hover:text-white hover:bg-obsidian-800">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-white">AI Analysis Results</h1>
          <p className="text-obsidian-400 text-sm">{data?.project?.name}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw size={14} /></Button>
          <Button size="sm" onClick={handleAnalyze} isLoading={analyzing}>
            <Sparkles size={14} /> Re-analyze
          </Button>
        </div>
      </div>

      {/* Cloudinary AI badge */}
      {s.analyzedWith?.cloudinary > 0 && (
        <div className="glass-gold rounded-xl px-4 py-2.5 flex items-center gap-3">
          <CheckCircle size={16} className="text-gold-400 flex-shrink-0" />
          <p className="text-sm text-gold-300">
            <span className="font-semibold">{s.analyzedWith.cloudinary} photos</span> analyzed with Cloudinary AI
            {s.analyzedWith.sharpOnly > 0 && <span className="text-obsidian-400"> · {s.analyzedWith.sharpOnly} with Sharp pixel analysis (local files)</span>}
          </p>
        </div>
      )}

      {/* Progress */}
      {prog.total > 0 && (
        <div className="glass rounded-xl border border-obsidian-700 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-obsidian-300">Analysis Progress</span>
            <span className="font-mono text-gold-400 text-sm">{prog.analyzed}/{prog.total}</span>
          </div>
          <div className="w-full bg-obsidian-700 rounded-full h-2">
            <motion.div initial={{ width: 0 }}
              animate={{ width: `${prog.total ? (prog.analyzed/prog.total)*100 : 0}%` }}
              className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full" />
          </div>
        </div>
      )}

      {/* Top stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile icon="⭐" label="Best Picks"    value={s.bestPicks    || 0} color="text-gold-400" />
        <StatTile icon="📊" label="Avg AI Score"  value={`${s.avgScore  || 0}`} color="text-green-400" />
        <StatTile icon="🔁" label="Duplicates"    value={s.duplicates   || 0} color="text-orange-400" />
        <StatTile icon="😑" label="Closed Eyes"   value={s.closedEyes   || 0} color="text-red-400" sub="Cloudinary AI" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <Card>
          <CardHeader><h2 className="font-semibold text-white">Photo Quality Breakdown</h2></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <PieChart width={160} height={160}>
                  <Pie data={pieData} cx={80} cy={80} innerRadius={48} outerRadius={75} paddingAngle={2} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
                <div className="space-y-1.5 flex-1">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-xs text-obsidian-400">{d.name}</span>
                      </div>
                      <span className="text-xs font-mono text-obsidian-200">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <p className="text-obsidian-500 text-sm text-center py-8">No analyzed photos yet</p>}
          </CardContent>
        </Card>

        {/* Issues detected */}
        <Card>
          <CardHeader><h2 className="font-semibold text-white">Issues Detected</h2></CardHeader>
          <CardContent className="space-y-3">
            <MetricBar label="Blurry / Out of Focus"  value={s.blurry||0}        max={analyzed} color="bg-orange-400" />
            <MetricBar label="Underexposed (too dark)" value={s.underexposed||0}  max={analyzed} color="bg-blue-400" />
            <MetricBar label="Overexposed (blown)"    value={s.overexposed||0}   max={analyzed} color="bg-yellow-400" />
            <MetricBar label="Closed Eyes"            value={s.closedEyes||0}    max={analyzed} color="bg-red-400" />
            <MetricBar label="High Noise"             value={s.noisy||0}         max={analyzed} color="bg-purple-400" />
            <MetricBar label="Duplicate / Similar"    value={s.duplicates||0}    max={analyzed} color="bg-pink-400" />
          </CardContent>
        </Card>
      </div>

      {/* Photo types bar chart */}
      {typeBarData.length > 0 && (
        <Card>
          <CardHeader><h2 className="font-semibold text-white">Photo Types Detected by AI</h2></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={typeBarData} barSize={24}>
                <XAxis dataKey="name" tick={{ fill: '#737373', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #3a3a3a', borderRadius: 8 }} />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Individual stats grid */}
      <Card>
        <CardHeader><h2 className="font-semibold text-white">Complete Photo Census</h2></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[
              { icon:'🧑',  label:'Portraits',    value: s.portraits    || 0 },
              { icon:'💑',  label:'Couples',      value: s.couples      || 0 },
              { icon:'👥',  label:'Groups',       value: s.groups       || 0 },
              { icon:'🌄',  label:'Landscapes',   value: s.landscapes   || 0 },
              { icon:'◑',   label:'Black & White',value: s.blackAndWhite|| 0 },
              { icon:'🎨',  label:'Color Graded', value: s.colorGraded  || 0 },
              { icon:'💍',  label:'Wedding shots',value: s.wedding      || 0 },
              { icon:'🌙',  label:'Night shots',  value: s.nightShots   || 0 },
              { icon:'🏠',  label:'Indoor',       value: s.indoor       || 0 },
              { icon:'🌳',  label:'Outdoor',      value: s.outdoor      || 0 },
            ].map(t => (
              <div key={t.label} className="glass rounded-xl border border-obsidian-700 p-3 text-center">
                <div className="text-xl mb-1">{t.icon}</div>
                <div className="text-lg font-bold font-mono text-white">{t.value}</div>
                <div className="text-xs text-obsidian-500">{t.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button className="flex-1" onClick={() => navigate(`/dashboard/projects/${projectId}/collections`)}>
          <Sparkles size={15} /> View Smart Collections
        </Button>
        <Button variant="outline" onClick={() => navigate(`/dashboard/projects/${projectId}/duplicates`)}>
          <Copy size={15} /> View Duplicates
        </Button>
      </div>
    </div>
  );
}
