import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Mail, Lock, User, Eye, EyeOff, CheckCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { toast } from '@/components/ui/Toaster';
import useAuthStore from '@/store/authStore';

const perks = ['500 photos free/month','AI analysis & scoring','Smart collections','Duplicate detection'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name required';
    if (!form.email) e.email = 'Email required';
    if (form.password.length < 6) e.password = 'Minimum 6 characters';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const res = await register(form.name, form.email, form.password);
    if (res.success) { toast.success('Account created! Welcome to Cullective AI 🎉'); navigate('/dashboard'); }
    else toast.error(res.message || 'Registration failed');
  };

  return (
    <div className="min-h-screen bg-obsidian-950 flex">
      <div className="w-full lg:w-[480px] flex items-center justify-center p-8">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center">
              <Camera size={18} className="text-gold-400" />
            </div>
            <span className="font-display text-xl text-white font-semibold">Cullective <span className="text-gold-400">AI</span></span>
          </div>

          <h1 className="font-display text-3xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-obsidian-400 mb-8">Start culling smarter — free forever</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full name" placeholder="Jane Smith" value={form.name}
              onChange={e=>setForm(f=>({...f,name:e.target.value}))} icon={<User size={16}/>} error={errors.name} />
            <Input label="Email address" type="email" placeholder="you@studio.com" value={form.email}
              onChange={e=>setForm(f=>({...f,email:e.target.value}))} icon={<Mail size={16}/>} error={errors.email} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-obsidian-300">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-obsidian-400" />
                <input type={showPw?'text':'password'} placeholder="Min. 6 characters" value={form.password}
                  onChange={e=>setForm(f=>({...f,password:e.target.value}))}
                  className="w-full bg-obsidian-800 border border-obsidian-600 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-obsidian-500 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500/60 transition-all" />
                <button type="button" onClick={()=>setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-obsidian-400 hover:text-white">
                  {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
            </div>
            <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>Create Free Account</Button>
          </form>

          <div className="mt-6 space-y-2">
            {perks.map(p=>(
              <div key={p} className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-400 flex-shrink-0" />
                <span className="text-xs text-obsidian-400">{p}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-obsidian-500">
              Already have an account?{' '}
              <Link to="/login" className="text-gold-400 hover:text-gold-300 font-medium">Sign in</Link>
            </p>
          </div>
        </motion.div>
      </div>

      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gold-900/10 to-obsidian-950" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 z-10">
          <div className="glass rounded-3xl border border-obsidian-700 p-8 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center">
                <Camera size={18} className="text-gold-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Wedding Shoot 2024</p>
                <p className="text-xs text-obsidian-500">3,247 photos analyzed</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {['⭐ Best Picks','💧 Blurry','👥 Groups','💑 Couples','🧑 Portraits','◑ B&W'].map(label=>(
                <div key={label} className="glass rounded-xl p-2 text-center">
                  <p className="text-[11px] text-obsidian-300">{label}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-obsidian-400 mb-1">
                <span>Analysis complete</span><span className="text-gold-400">94%</span>
              </div>
              <div className="w-full bg-obsidian-700 rounded-full h-1.5">
                <div className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full" style={{width:'94%'}} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
