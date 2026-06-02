import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { toast } from '@/components/ui/Toaster';
import useAuthStore from '@/store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, googleLogin, isLoading } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email required';
    if (!form.password) e.password = 'Password required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const res = await login(form.email, form.password);
    if (res.success) { toast.success('Welcome back!'); navigate('/dashboard'); }
    else toast.error(res.message || 'Login failed');
  };

  // Google Sign-In using accounts.google.com/gsi/client
  const handleGoogle = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) { toast.error('Google login not configured — add VITE_GOOGLE_CLIENT_ID to .env'); return; }
    /* global google */
    if (typeof google === 'undefined') {
      // Load script dynamically if not present
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.onload = () => initGoogle(clientId);
      document.head.appendChild(s);
    } else {
      initGoogle(clientId);
    }
  };

  const initGoogle = (clientId) => {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: async ({ credential }) => {
        const res = await googleLogin(credential);
        if (res.success) { toast.success('Signed in with Google!'); navigate('/dashboard'); }
        else toast.error(res.message || 'Google login failed');
      },
    });
    google.accounts.id.prompt();
  };

  return (
    <div className="min-h-screen bg-obsidian-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-obsidian-900 via-obsidian-950 to-obsidian-900"/>
        <div className="relative z-10 grid grid-cols-3 gap-3 opacity-40">
          {Array.from({length:9}).map((_,i)=>(
            <div key={i} className={`w-24 h-24 rounded-2xl ${['bg-obsidian-700','bg-obsidian-800','bg-obsidian-600'][i%3]} border border-obsidian-600`}/>
          ))}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-12">
          <h2 className="font-display text-3xl font-bold text-white text-center mb-3">AI Photo Culling</h2>
          <p className="text-obsidian-400 text-center max-w-xs">Scan 3,000 photos in minutes. No manual upload needed.</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full lg:w-[480px] flex items-center justify-center p-8">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center">
              <Camera size={18} className="text-gold-400"/>
            </div>
            <span className="font-display text-xl text-white font-semibold">Cullective <span className="text-gold-400">AI</span></span>
          </div>

          <h1 className="font-display text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-obsidian-400 mb-8">Sign in to your photography workspace</p>

          {/* Google button */}
          <button onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-obsidian-600 hover:border-obsidian-500 rounded-xl px-4 py-2.5 text-sm text-white transition-all mb-4">
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-obsidian-700"/>
            <span className="text-xs text-obsidian-600">or</span>
            <div className="flex-1 h-px bg-obsidian-700"/>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input label="Email address" type="email" placeholder="you@studio.com" value={form.email}
              onChange={e=>setForm(f=>({...f,email:e.target.value}))} icon={<Mail size={16}/>} error={errors.email}/>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-obsidian-300">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-obsidian-400"/>
                <input type={showPw?'text':'password'} placeholder="••••••••" value={form.password}
                  onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                  className="w-full bg-obsidian-800 border border-obsidian-600 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-obsidian-500 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500/60"/>
                <button type="button" onClick={()=>setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-obsidian-400 hover:text-white">
                  {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
            </div>
            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>Sign In</Button>
          </form>

          <p className="text-sm text-obsidian-500 text-center mt-6">
            No account? <Link to="/register" className="text-gold-400 hover:text-gold-300 font-medium">Create one free</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
