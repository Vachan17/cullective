import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs) => twMerge(clsx(inputs));

export const formatBytes = (bytes, decimals = 2) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const formatDate = (date) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(date));
};

export const getScoreColor = (score) => {
  if (score >= 85) return '#10B981';  // green
  if (score >= 70) return '#F59E0B';  // gold
  if (score >= 50) return '#F97316';  // orange
  return '#EF4444';                    // red
};

export const getScoreLabel = (score) => {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Average';
  return 'Poor';
};

export const truncate = (str, n) => str?.length > n ? `${str.substring(0, n)}...` : str;

export const debounce = (fn, ms) => {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
};

export const shootTypeColors = {
  wedding: '#EC4899', portrait: '#3B82F6', event: '#8B5CF6',
  commercial: '#F59E0B', landscape: '#10B981', wildlife: '#84CC16',
  sports: '#EF4444', other: '#6B7280',
};

export const shootTypeLabels = {
  wedding: '💍 Wedding', portrait: '🧑 Portrait', event: '🎉 Event',
  commercial: '💼 Commercial', landscape: '🌄 Landscape', wildlife: '🦁 Wildlife',
  sports: '⚽ Sports', other: '📸 Other',
};

export const getPhotoDisplayUrl = (photo) => {
  if (!photo) return '';
  const url = photo.url;
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const token = localStorage.getItem('cullective_token');
  return `/api/photos/local?photoId=${photo._id}&token=${token}`;
};
