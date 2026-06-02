import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Sparkles, Zap, Shield, ChevronRight, Star, CheckCircle, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';

const features = [
  { icon: Sparkles, title: 'AI Photo Analysis', desc: 'Automatically detect blur, closed eyes, duplicates, and exposure issues across thousands of photos.' },
  { icon: Zap, title: 'Instant Culling', desc: 'Cut culling time by 90%. Get a scored, tagged, and organized library in minutes, not days.' },
  { icon: Shield, title: 'Smart Collections', desc: 'Auto-curated folders: Best Picks, Portraits, Group Photos, Instagram Worthy, and more.' },
];

const stats = [
  { value: '10×', label: 'Faster culling' },
  { value: '94%', label: 'Accuracy rate' },
  { value: '3000+', label: 'Photos / shoot' },
  { value: '50+', label: 'Smart tags' },
];

const testimonials = [
  { name: 'Sarah Chen', role: 'Wedding Photographer', text: 'Cullective AI cut my post-processing time in half. I used to spend 4 hours culling a wedding — now it\'s 30 minutes.' },
  { name: 'Marcus Williams', role: 'Event Photographer', text: 'The duplicate detection alone saves me an hour per event. The AI scores are eerily accurate.' },
  { name: 'Priya Nair', role: 'Portrait Studio', text: 'My clients love the turnaround time. Smart collections make client delivery effortless.' },
];

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-obsidian-950 text-white overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-obsidian-800/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gold-500/20 border border-gold-500/30 flex items-center justify-center">
              <Camera size={16} className="text-gold-400" />
            </div>
            <span className="font-display font-semibold text-lg">Cullective <span className="text-gold-400">AI</span></span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Sign In</Button>
            <Button size="sm" onClick={() => navigate('/register')}>Start Free</Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gold-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div {...fadeUp} className="inline-flex items-center gap-2 glass-gold px-4 py-2 rounded-full text-sm text-gold-400 mb-8">
            <Sparkles size={14} /> AI-powered for professional photographers
          </motion.div>
          <motion.h1 {...fadeUp} transition={{ delay: 0.1 }} className="font-display text-5xl sm:text-7xl font-bold leading-tight mb-6">
            Cull 3000 Photos<br /><span className="text-gradient">in 30 Minutes</span>
          </motion.h1>
          <motion.p {...fadeUp} transition={{ delay: 0.2 }} className="text-lg text-obsidian-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Cullective AI analyzes every photo in your shoot — detecting blur, closed eyes, duplicates, and exposure issues — so you keep only the best.
          </motion.p>
          <motion.div {...fadeUp} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button xl onClick={() => navigate('/register')}>
              Start for Free <ArrowRight size={18} />
            </Button>
            <Button variant="outline" xl onClick={() => navigate('/login')}>
              View Demo
            </Button>
          </motion.div>

          {/* Cinematic photo grid preview */}
          <motion.div {...fadeUp} transition={{ delay: 0.4 }} className="mt-16 grid grid-cols-4 sm:grid-cols-6 gap-2 max-w-3xl mx-auto">
            {Array.from({ length: 18 }).map((_, i) => (
              <motion.div
                key={i} whileHover={{ scale: 1.05, zIndex: 10 }}
                className="aspect-square rounded-xl bg-obsidian-800 border border-obsidian-700 overflow-hidden relative"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className={`w-full h-full ${['bg-gradient-to-br from-obsidian-700 to-obsidian-900','bg-gradient-to-br from-obsidian-800 to-obsidian-700','bg-gradient-to-br from-obsidian-600 to-obsidian-800'][i%3]}`} />
                {i % 5 === 0 && <div className="absolute top-1 right-1 w-4 h-4 bg-gold-400 rounded-full flex items-center justify-center"><Star size={8} className="text-obsidian-900 fill-obsidian-900" /></div>}
                {i % 7 === 0 && <div className="absolute inset-0 bg-red-900/30 flex items-center justify-center"><span className="text-red-400 text-[10px] font-bold">BLUR</span></div>}
                {i % 3 === 0 && <div className="absolute bottom-1 right-1 bg-green-500 text-white text-[8px] font-bold rounded px-1">{70+i*2}</div>}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-y border-obsidian-800">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.1 }}>
              <div className="text-4xl font-display font-bold text-gradient mb-1">{s.value}</div>
              <div className="text-sm text-obsidian-400">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-obsidian-400 max-w-xl mx-auto">Professional tools built for photographers who demand the best.</p>
          </motion.div>
          <div className="grid sm:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl border border-obsidian-700 p-6 card-hover">
                <div className="w-12 h-12 rounded-xl bg-gold-500/15 border border-gold-500/25 flex items-center justify-center mb-4">
                  <f.icon size={22} className="text-gold-400" />
                </div>
                <h3 className="font-display text-xl font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-obsidian-400 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Workflow */}
      <section className="py-24 px-6 bg-obsidian-900/30">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold mb-4">How the AI Works</h2>
          </motion.div>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { step: '01', title: 'Upload', desc: 'Drag & drop your entire shoot folder.' },
              { step: '02', title: 'Analyze', desc: 'AI scans every photo for 14+ quality metrics.' },
              { step: '03', title: 'Organize', desc: 'Smart collections built automatically.' },
              { step: '04', title: 'Deliver', desc: 'Export best picks to Lightroom or Photoshop.' },
            ].map((s, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.1 }} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center mx-auto mb-4">
                  <span className="font-mono text-gold-400 font-bold text-sm">{s.step}</span>
                </div>
                <h3 className="font-semibold text-white mb-1">{s.title}</h3>
                <p className="text-sm text-obsidian-400">{s.desc}</p>
                {i < 3 && <div className="hidden sm:block absolute right-0 top-1/2 text-obsidian-600"><ChevronRight /></div>}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div {...fadeUp} className="text-center mb-16">
            <h2 className="font-display text-4xl font-bold mb-4">Loved by Photographers</h2>
          </motion.div>
          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl border border-obsidian-700 p-6">
                <div className="flex gap-1 mb-4">{Array(5).fill(0).map((_,j)=><Star key={j} size={14} className="text-gold-400 fill-gold-400" />)}</div>
                <p className="text-obsidian-300 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="font-semibold text-white text-sm">{t.name}</p>
                  <p className="text-xs text-obsidian-500">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="absolute inset-x-0 h-[400px] bg-gold-500/3 blur-[100px] pointer-events-none" />
          <motion.div {...fadeUp}>
            <h2 className="font-display text-5xl font-bold mb-6">Start Culling Smarter</h2>
            <p className="text-obsidian-400 mb-10">Free plan includes 500 photos per month. No credit card required.</p>
            <Button xl onClick={() => navigate('/register')}>
              <Camera size={20} /> Create Free Account
            </Button>
            <p className="text-xs text-obsidian-600 mt-4">Wedding photographers save an average of 6 hours per shoot.</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-obsidian-800 py-8 px-6 text-center">
        <p className="text-obsidian-600 text-sm">© 2024 Cullective AI. Built for photographers, by photographers.</p>
      </footer>
    </div>
  );
}
