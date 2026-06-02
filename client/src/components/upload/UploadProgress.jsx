import { motion } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';
export default function UploadProgress({ progress, total, uploaded, isComplete }) {
  return (
    <div className="glass rounded-2xl border border-obsidian-700 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isComplete ? 'bg-green-500/20 border-green-500/30' : 'bg-gold-500/20 border-gold-500/30'} border`}>
          {isComplete ? <CheckCircle size={20} className="text-green-400" /> : <Loader2 size={20} className="text-gold-400 animate-spin" />}
        </div>
        <div>
          <p className="font-medium text-white">{isComplete ? 'Upload Complete!' : 'Uploading Photos…'}</p>
          <p className="text-sm text-obsidian-400">{uploaded} of {total} uploaded</p>
        </div>
        <span className="ml-auto text-2xl font-mono font-bold text-gold-400">{progress}%</span>
      </div>
      <div className="w-full bg-obsidian-700 rounded-full h-2 overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full" initial={{width:0}} animate={{width:`${progress}%`}} />
      </div>
    </div>
  );
}
