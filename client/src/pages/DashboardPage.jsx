import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FolderOpen, Image, Star, Trash2, HardDrive, Plus, TrendingUp, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { formatBytes, formatDate, shootTypeLabels } from '@/lib/utils';
import useAuthStore from '@/store/authStore';
import api from '@/lib/api';

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="glass rounded-2xl border border-obsidian-700 p-5">
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
    </div>
    <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
    <p className="text-sm text-obsidian-400">{label}</p>
    {sub && <p className="text-xs text-obsidian-600 mt-1">{sub}</p>}
  </motion.div>
);

const QUALITY_COLORS = ['#10B981','#F59E0B','#F97316','#EF4444'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => { setData(r.data.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const storagePercent = data ? Math.round((data.storage.used / data.storage.limit) * 100) : 0;

  const pieData = data?.qualityDistribution?.map((b, i) => ({
    name: ['Poor','Average','Good','Excellent','Best'][i] || 'Other',
    value: b.count,
  })) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-obsidian-400 mt-1">Here's your photography workspace overview</p>
        </div>
        <Button onClick={() => navigate('/dashboard/projects')}>
          <Plus size={16} /> New Project
        </Button>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_,i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={FolderOpen} label="Total Projects" value={data?.overview.totalProjects || 0} color="bg-blue-500/15 border border-blue-500/25 text-blue-400" />
          <StatCard icon={Image} label="Total Photos" value={(data?.overview.totalPhotos || 0).toLocaleString()} color="bg-gold-500/15 border border-gold-500/25 text-gold-400" />
          <StatCard icon={Star} label="Best Picks" value={data?.overview.starredPhotos || 0} color="bg-green-500/15 border border-green-500/25 text-green-400" />
          <StatCard icon={Trash2} label="Rejected" value={data?.overview.rejectedPhotos || 0} color="bg-red-500/15 border border-red-500/25 text-red-400" />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quality Distribution */}
        <Card className="lg:col-span-1">
          <CardHeader><h2 className="font-semibold text-white flex items-center gap-2"><TrendingUp size={16} className="text-gold-400" /> Quality Distribution</h2></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex flex-col items-center">
                <PieChart width={180} height={180}>
                  <Pie data={pieData} cx={90} cy={90} innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((_,i) => <Cell key={i} fill={QUALITY_COLORS[i % QUALITY_COLORS.length]} />)}
                  </Pie>
                </PieChart>
                <div className="grid grid-cols-2 gap-2 w-full mt-2">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor: QUALITY_COLORS[i % QUALITY_COLORS.length]}} />
                      <span className="text-xs text-obsidian-400 truncate">{d.name}: {d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-obsidian-600 text-sm">No analyzed photos yet</div>
            )}
          </CardContent>
        </Card>

        {/* Storage */}
        <Card className="lg:col-span-1">
          <CardHeader><h2 className="font-semibold text-white flex items-center gap-2"><HardDrive size={16} className="text-gold-400" /> Storage</h2></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-obsidian-400">{formatBytes(data?.storage.used || 0)} used</span>
                <span className="text-obsidian-500">{formatBytes(data?.storage.limit || 0)}</span>
              </div>
              <div className="w-full bg-obsidian-700 rounded-full h-2.5 overflow-hidden">
                <motion.div initial={{width:0}} animate={{width:`${storagePercent}%`}} transition={{duration:1,ease:'easeOut'}}
                  className={`h-full rounded-full ${storagePercent > 80 ? 'bg-red-500' : 'bg-gradient-to-r from-gold-600 to-gold-400'}`} />
              </div>
              <p className="text-xs text-obsidian-500 mt-1">{storagePercent}% used</p>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Analyzed', value: data?.overview.analyzedPhotos || 0, color: 'text-blue-400' },
                { label: 'Starred', value: data?.overview.starredPhotos || 0, color: 'text-gold-400' },
                { label: 'Rejected', value: data?.overview.rejectedPhotos || 0, color: 'text-red-400' },
              ].map(s => (
                <div key={s.label} className="flex justify-between text-sm">
                  <span className="text-obsidian-400">{s.label}</span>
                  <span className={`font-mono font-medium ${s.color}`}>{s.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-1">
          <CardHeader><h2 className="font-semibold text-white flex items-center gap-2"><Zap size={16} className="text-gold-400" /> Recent Activity</h2></CardHeader>
          <CardContent className="space-y-3">
            {data?.recentActivity?.length ? data.recentActivity.slice(0,6).map((a,i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-obsidian-700 flex items-center justify-center flex-shrink-0">
                  {a.action.includes('upload') ? <Image size={13} className="text-gold-400" /> :
                   a.action.includes('analysis') ? <Zap size={13} className="text-blue-400" /> :
                   <Star size={13} className="text-green-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-obsidian-200 truncate capitalize">{a.action.replace(/_/g,' ')}</p>
                  <p className="text-[11px] text-obsidian-600">{formatDate(a.createdAt)}</p>
                </div>
                {a.count > 1 && <span className="text-xs text-obsidian-500">{a.count}</span>}
              </div>
            )) : (
              <p className="text-sm text-obsidian-600 text-center py-4">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-white">Recent Projects</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/projects')}>View all</Button>
        </div>
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(3).fill(0).map((_,i) => <CardSkeleton key={i} />)}
          </div>
        ) : data?.recentProjects?.length ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.recentProjects.map((p, i) => (
              <motion.div key={p._id} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
                className="glass rounded-2xl border border-obsidian-700 p-5 card-hover cursor-pointer"
                onClick={() => navigate(`/dashboard/projects/${p._id}`)}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`px-2 py-1 rounded-lg text-xs font-medium ${p.status === 'ready' ? 'bg-green-500/15 text-green-400' : 'bg-gold-500/15 text-gold-400'}`}>
                    {p.status}
                  </div>
                  <span className="text-xs text-obsidian-500">{formatDate(p.createdAt)}</span>
                </div>
                <h3 className="font-semibold text-white mb-1 truncate">{p.name}</h3>
                <p className="text-xs text-obsidian-500">{(p.totalPhotos||0).toLocaleString()} photos</p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-2xl border border-obsidian-700 p-12 text-center">
            <FolderOpen size={40} className="text-obsidian-600 mx-auto mb-3" />
            <p className="text-obsidian-400 mb-4">No projects yet. Start your first shoot.</p>
            <Button onClick={() => navigate('/dashboard/projects')}><Plus size={16}/> Create Project</Button>
          </div>
        )}
      </div>
    </div>
  );
}
