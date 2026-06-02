import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Shield, Palette, HardDrive, Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { toast } from '@/components/ui/Toaster';
import { formatBytes } from '@/lib/utils';
import useAuthStore from '@/store/authStore';
import api from '@/lib/api';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(user?.preferences?.autoAnalyze ?? true);
  const [theme, setTheme] = useState(user?.preferences?.theme || 'dark');

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/auth/profile', { name, preferences: { autoAnalyze, theme } });
      updateUser({ name, preferences: { ...user?.preferences, autoAnalyze, theme } });
      toast.success('Settings saved!');
    } catch { toast.error('Failed to save settings'); }
    setSaving(false);
  };

  const storagePercent = user ? Math.round((user.storageUsed / user.storageLimit) * 100) : 0;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Settings</h1>
        <p className="text-obsidian-400 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="glass rounded-2xl border border-obsidian-700 p-6 space-y-4">
        <h2 className="font-semibold text-white flex items-center gap-2"><User size={16} className="text-gold-400"/> Profile</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center text-2xl font-bold text-gold-400">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-white">{user?.name}</p>
            <p className="text-sm text-obsidian-400">{user?.email}</p>
            <span className="text-xs bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full capitalize">{user?.plan} plan</span>
          </div>
        </div>
        <Input label="Display name" value={name} onChange={e=>setName(e.target.value)} />
      </motion.div>

      {/* Preferences */}
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="glass rounded-2xl border border-obsidian-700 p-6 space-y-4">
        <h2 className="font-semibold text-white flex items-center gap-2"><Palette size={16} className="text-gold-400"/> Preferences</h2>
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm text-white">Auto-analyze after upload</p>
            <p className="text-xs text-obsidian-500">Automatically start AI analysis when photos are uploaded</p>
          </div>
          <button onClick={() => setAutoAnalyze(v=>!v)}
            className={`relative w-11 h-6 rounded-full transition-colors ${autoAnalyze ? 'bg-gold-500' : 'bg-obsidian-600'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${autoAnalyze ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      </motion.div>

      {/* Storage */}
      <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.2}} className="glass rounded-2xl border border-obsidian-700 p-6 space-y-3">
        <h2 className="font-semibold text-white flex items-center gap-2"><HardDrive size={16} className="text-gold-400"/> Storage</h2>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-obsidian-400">{formatBytes(user?.storageUsed||0)} used</span>
          <span className="text-obsidian-500">{formatBytes(user?.storageLimit||0)} total</span>
        </div>
        <div className="w-full bg-obsidian-700 rounded-full h-2.5 overflow-hidden">
          <motion.div initial={{width:0}} animate={{width:`${storagePercent}%`}} transition={{duration:1}}
            className={`h-full rounded-full ${storagePercent > 80 ? 'bg-red-500' : 'bg-gradient-to-r from-gold-600 to-gold-400'}`} />
        </div>
        <p className="text-xs text-obsidian-500">{storagePercent}% used of your free tier</p>
        {user?.plan === 'free' && (
          <Button variant="outline" size="sm">Upgrade to Pro for 100GB</Button>
        )}
      </motion.div>

      <Button size="lg" onClick={save} isLoading={saving}><Save size={16}/> Save Changes</Button>
    </div>
  );
}
