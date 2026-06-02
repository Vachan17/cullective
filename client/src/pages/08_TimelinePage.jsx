/**
 * ================================================================
 * FILE: client/src/pages/TimelinePage.jsx
 * ================================================================
 * Photos organized by shoot date/time using EXIF data.
 * Groups photos into time clusters (morning / afternoon / evening).
 *
 * ADD route in client/src/App.jsx:
 *   import TimelinePage from '@/pages/TimelinePage';
 *   <Route path="projects/:projectId/timeline" element={<TimelinePage />} />
 *
 * ADD link in ProjectDetailPage quick-nav section:
 *   { icon: Clock, label: 'Timeline', to: 'timeline', color: 'text-teal-400', bg: 'bg-teal-500/10 border-teal-500/20' }
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Calendar, Camera } from 'lucide-react';
import PhotoCard from '@/components/photos/PhotoCard';
import { toast } from '@/components/ui/Toaster';
import { formatDate } from '@/lib/utils';
import usePhotoStore from '@/store/photoStore';
import api from '@/lib/api';

const getHourLabel = (hour) => {
  if (hour >= 5  && hour < 8)  return '🌅 Golden Hour (Morning)';
  if (hour >= 8  && hour < 12) return '☀️ Morning';
  if (hour >= 12 && hour < 14) return '🌞 Midday';
  if (hour >= 14 && hour < 17) return '🌤 Afternoon';
  if (hour >= 17 && hour < 20) return '🌇 Golden Hour (Evening)';
  if (hour >= 20 || hour < 5)  return '🌙 Night';
  return '📸 Unknown Time';
};

const groupByTime = (photos) => {
  const withTime = [], withoutTime = [];

  photos.forEach(p => {
    const takenAt = p.metadata?.takenAt || p.createdAt;
    if (takenAt) {
      const d = new Date(takenAt);
      withTime.push({ ...p, _date: d, _hour: d.getHours() });
    } else {
      withoutTime.push(p);
    }
  });

  withTime.sort((a, b) => a._date - b._date);

  // Group into clusters by hour
  const groups = {};
  withTime.forEach(p => {
    const label = getHourLabel(p._hour);
    const dateStr = formatDate(p._date);
    const key   = `${dateStr} — ${label}`;
    if (!groups[key]) groups[key] = { label, dateStr, photos: [] };
    groups[key].photos.push(p);
  });

  const result = Object.entries(groups).map(([key, g]) => ({ key, ...g }));
  if (withoutTime.length) {
    result.push({ key: 'no-time', label: '📁 No EXIF Timestamp', dateStr: '', photos: withoutTime });
  }
  return result;
};

export default function TimelinePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { updatePhotoStatus } = usePhotoStore();
  const [groups, setGroups]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats]     = useState({ total: 0, withExif: 0 });

  useEffect(() => {
    api.get(`/photos/project/${projectId}`, { params: { limit: 1000 } })
      .then(r => {
        const photos = r.data.data || [];
        setGroups(groupByTime(photos));
        setStats({
          total:    photos.length,
          withExif: photos.filter(p => p.metadata?.takenAt).length,
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  const handleStar   = async (photo) => { await updatePhotoStatus(photo._id, photo.status === 'starred' ? 'analyzed' : 'starred'); };
  const handleReject = async (photo) => { await updatePhotoStatus(photo._id, 'rejected'); toast.success('Photo rejected'); };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-obsidian-400 hover:text-white hover:bg-obsidian-800">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-white">Timeline View</h1>
          <p className="text-obsidian-400 text-sm">
            {stats.withExif} of {stats.total} photos have EXIF timestamps
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-gold-400 border-t-transparent rounded-full" />
        </div>
      ) : groups.length === 0 ? (
        <div className="glass rounded-2xl border border-obsidian-700 p-16 text-center">
          <Clock size={40} className="text-obsidian-600 mx-auto mb-3" />
          <p className="text-obsidian-400">No photos yet</p>
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map((group, gi) => (
            <motion.div key={group.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.06 }}>
              {/* Group header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{group.label.split(' ')[0]}</span>
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      {group.label.replace(/^[^\s]+\s/, '')}
                    </h2>
                    {group.dateStr && <p className="text-xs text-obsidian-500">{group.dateStr}</p>}
                  </div>
                </div>
                <div className="flex-1 h-px bg-obsidian-700 ml-2" />
                <span className="text-xs text-obsidian-500 flex-shrink-0">
                  {group.photos.length} photo{group.photos.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Photos */}
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-2">
                {group.photos.map(photo => (
                  <PhotoCard
                    key={photo._id}
                    photo={photo}
                    isSelected={false}
                    onSelect={() => {}}
                    onStar={handleStar}
                    onReject={handleReject}
                    onClick={p => navigate(`/dashboard/photos/${p._id}`)}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
