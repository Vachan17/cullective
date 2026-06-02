import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, FolderOpen, Upload, Sparkles,
  BookImage, Copy, Settings, LogOut, Camera
} from 'lucide-react';
import useAuthStore from '@/store/authStore';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/dashboard' },
  { icon: FolderOpen, label: 'Projects', to: '/dashboard/projects' },
];

const navItemClass = ({ isActive }) => cn(
  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group',
  isActive
    ? 'bg-gold-500/15 text-gold-400 border border-gold-500/25'
    : 'text-obsidian-400 hover:text-white hover:bg-obsidian-800'
);

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-64 h-full glass border-r border-obsidian-700/50 flex flex-col py-5 px-3 shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-3 mb-8">
        <div className="w-8 h-8 rounded-xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center">
          <Camera size={16} className="text-gold-400" />
        </div>
        <div>
          <span className="font-display text-white font-semibold text-base">Cullective</span>
          <span className="text-gold-400 font-display text-base"> AI</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/dashboard'} className={navItemClass}>
            <item.icon size={17} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div className="pt-4 pb-1">
          <p className="px-3 text-[10px] font-semibold text-obsidian-600 uppercase tracking-widest mb-2">Tools</p>
        </div>

        <NavLink to="/dashboard/settings" className={navItemClass}>
          <Settings size={17} />
          <span>Settings</span>
        </NavLink>
      </nav>

      {/* User */}
      <div className="mt-auto pt-4 border-t border-obsidian-700/50">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-obsidian-800/50">
          <div className="w-8 h-8 rounded-full bg-gold-500/20 border border-gold-500/30 flex items-center justify-center text-gold-400 text-xs font-bold shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-obsidian-500 truncate">{user?.plan} plan</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="text-obsidian-500 hover:text-red-400 transition-colors p-1"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}
