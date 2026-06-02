import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Upload, X } from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';

export default function DropZone({ onFiles, maxFiles = 500 }) {
  const [files, setFiles] = useState([]);
  const onDrop = useCallback((accepted) => {
    const next = [...files, ...accepted].slice(0, maxFiles);
    setFiles(next); onFiles?.(next);
  }, [files, onFiles, maxFiles]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.jpg','.jpeg','.png','.webp','.tiff'] }, maxFiles,
  });
  const removeFile = (idx) => { const next = files.filter((_,i)=>i!==idx); setFiles(next); onFiles?.(next); };
  return (
    <div className="space-y-4">
      <div {...getRootProps()} className={cn('border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all',
        isDragActive ? 'border-gold-400 bg-gold-500/10' : 'border-obsidian-600 bg-obsidian-800/30 hover:border-gold-500/50')}>
        <input {...getInputProps()} />
        <motion.div animate={isDragActive ? {scale:1.05} : {scale:1}} className="flex flex-col items-center gap-4">
          <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center',
            isDragActive ? 'bg-gold-500/20 border border-gold-500/40' : 'bg-obsidian-700 border border-obsidian-600')}>
            <Upload size={28} className={isDragActive ? 'text-gold-400' : 'text-obsidian-400'} />
          </div>
          <div>
            <p className="text-lg font-medium text-white mb-1">{isDragActive ? 'Drop photos here' : 'Drag & drop photos'}</p>
            <p className="text-sm text-obsidian-400">or <span className="text-gold-400">browse files</span> — JPG, PNG, WebP, TIFF</p>
          </div>
        </motion.div>
      </div>
      {files.length > 0 && (
        <div className="glass rounded-2xl border border-obsidian-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white">{files.length} photos ({formatBytes(files.reduce((s,f)=>s+f.size,0))})</p>
            <button onClick={() => { setFiles([]); onFiles?.([]); }} className="text-xs text-red-400">Clear all</button>
          </div>
          <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto">
            {files.slice(0,30).map((file, i) => (
              <div key={i} className="relative group aspect-square">
                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover rounded-lg" />
                <button onClick={() => removeFile(i)} className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full hidden group-hover:flex items-center justify-center">
                  <X size={8} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
