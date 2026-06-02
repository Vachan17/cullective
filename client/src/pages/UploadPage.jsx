import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, FolderOpen, Upload, Link2, Sparkles,
  CheckCircle, ChevronRight, ChevronUp, File, Loader2,
  HardDrive, Monitor, AlertCircle
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import DropZone from '@/components/upload/DropZone';
import { toast } from '@/components/ui/Toaster';
import { formatBytes } from '@/lib/utils';
import usePhotoStore from '@/store/photoStore';
import api from '@/lib/api';

// ── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'local', icon: HardDrive, label: 'Local Folder', desc: 'Scan directly — no upload needed' },
  { id: 'browser', icon: Upload, label: 'Browser Upload', desc: 'Select files from this device' },
];

// ── Local Folder Scanner ─────────────────────────────────────────────────────
function LocalScanTab({ projectId }) {
  const navigate = useNavigate();
  const { scanLocalFolder } = usePhotoStore();
  const [folderPath, setFolderPath] = useState('');
  const [browseData, setBrowseData] = useState(null);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [done, setDone] = useState(false);

  const commonPaths = [
    { label: 'Pictures', path: `${navigator.platform.includes('Win') ? 'C:\\Users\\' : '/Users/'}` },
    { label: 'Desktop', path: '' },
    { label: 'Downloads', path: '' },
  ];

  const browse = async (dir) => {
    if (!dir) return;
    setBrowseLoading(true);
    try {
      const { data } = await api.get('/scan/browse', { params: { dir } });
      setBrowseData(data.data);
      setFolderPath(data.data.dir);
    } catch (e) {
      toast.error(e.message || 'Cannot read folder — make sure the server has access to this path');
    }
    setBrowseLoading(false);
  };

  const startScan = async (pathToScan = folderPath) => {
    const scanPath = typeof pathToScan === 'string' ? pathToScan.trim().replace(/^["']|["']$/g, '') : folderPath.trim().replace(/^["']|["']$/g, '');
    if (!scanPath) { toast.error('Enter a folder path'); return; }
    setScanning(true);
    setProgress({ type: 'start', processed: 0, total: 0, percent: 0 });
    try {
      const result = await scanLocalFolder(projectId, scanPath, (evt) => {
        setProgress(prev => ({ ...prev, ...evt }));
      });
      if (result.success) {
        setDone(true);
        toast.success('Scan complete! AI analysis finished.');
      } else {
        toast.error(result.message || 'Scan failed');
      }
    } catch (e) {
      toast.error(e.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  if (done) return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-4">
      <div className="glass rounded-2xl border border-green-500/30 p-6 text-center">
        <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-white mb-1">Scan Complete!</h3>
        <p className="text-obsidian-400 text-sm">{progress?.processed || 0} photos analyzed — no upload required</p>
      </div>
      <div className="flex gap-3">
        <Button className="flex-1" onClick={() => navigate(`/dashboard/projects/${projectId}/results`)}>
          <Sparkles size={15}/> View AI Results
        </Button>
        <Button variant="outline" onClick={() => navigate(`/dashboard/projects/${projectId}`)}>Back</Button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-5">
      {/* How it works */}
      <div className="glass-gold rounded-xl p-4 text-sm">
        <p className="text-gold-300 font-medium mb-1">⚡ No upload required</p>
        <p className="text-obsidian-400 text-xs leading-relaxed">
          Reads photos directly from your disk. Only thumbnails and AI scores are stored — originals never leave your machine.
          Perfect for 1,000+ photo shoots.
        </p>
      </div>

      {/* Path input + browse */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-obsidian-300">Folder path on this computer</label>
        <div className="flex gap-2">
          <input
            value={folderPath}
            onChange={e => setFolderPath(e.target.value)}
            placeholder="/Users/yourname/Photos/Wedding2024  or  C:\Photos\Shoot"
            className="flex-1 bg-obsidian-800 border border-obsidian-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-obsidian-600 focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500/60 font-mono"
            onKeyDown={e => e.key === 'Enter' && browse(folderPath)}
          />
          <Button variant="secondary" size="md" onClick={() => browse(folderPath)} isLoading={browseLoading}>
            <FolderOpen size={15}/>
          </Button>
        </div>
      </div>

      {/* Folder browser */}
      {browseData && (
        <div className="glass rounded-xl border border-obsidian-700 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-obsidian-700 bg-obsidian-800/50">
            {browseData.parent && (
              <button onClick={() => browse(browseData.parent)} className="text-obsidian-400 hover:text-gold-400 transition-colors">
                <ChevronUp size={15}/>
              </button>
            )}
            <span className="text-xs font-mono text-obsidian-400 truncate flex-1">{browseData.dir}</span>
            <span className="text-xs text-gold-400">{browseData.imageCount} images</span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {browseData.entries.slice(0, 50).map(entry => (
              <button
                key={entry.path}
                onClick={() => entry.isDir ? browse(entry.path) : null}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-obsidian-700 transition-colors text-xs ${entry.isDir ? 'cursor-pointer' : 'cursor-default opacity-60'}`}
              >
                {entry.isDir
                  ? <FolderOpen size={14} className="text-gold-400 flex-shrink-0"/>
                  : <File size={14} className="text-obsidian-500 flex-shrink-0"/>}
                <span className={`truncate ${entry.isDir ? 'text-white' : 'text-obsidian-400'}`}>{entry.name}</span>
                {!entry.isDir && <span className="ml-auto text-obsidian-600">{formatBytes(entry.size)}</span>}
                {entry.isDir && <ChevronRight size={12} className="ml-auto text-obsidian-600"/>}
              </button>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-obsidian-700">
            <Button className="w-full" size="sm" onClick={() => { setFolderPath(browseData.dir); startScan(browseData.dir); }} disabled={scanning}>
              <Sparkles size={14}/> Scan "{browseData.dir.split('/').pop() || browseData.dir}" ({browseData.imageCount} images)
            </Button>
          </div>
        </div>
      )}

      {/* Progress */}
      {scanning && progress && (
        <div className="glass rounded-xl border border-obsidian-700 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Loader2 size={18} className="text-gold-400 animate-spin flex-shrink-0"/>
            <div className="flex-1">
              <p className="text-sm text-white font-medium">Analyzing photos…</p>
              <p className="text-xs text-obsidian-400 truncate">{progress.current || 'Starting…'}</p>
            </div>
            <span className="text-gold-400 font-mono text-sm">{progress.percent || 0}%</span>
          </div>
          <div className="w-full bg-obsidian-700 rounded-full h-1.5 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full"
              initial={{width:0}} animate={{width:`${progress.percent || 0}%`}}
            />
          </div>
          <p className="text-xs text-obsidian-500">{progress.processed || 0} / {progress.total || '?'} photos</p>
        </div>
      )}

      {!scanning && !done && (
        <Button size="lg" className="w-full" onClick={() => startScan()} disabled={!folderPath}>
          <Sparkles size={16}/> Start Local Scan
        </Button>
      )}
    </div>
  );
}

// ── Browser Upload Tab ───────────────────────────────────────────────────────
function BrowserUploadTab({ projectId }) {
  const navigate = useNavigate();
  const { uploadPhotos, isUploading, uploadProgress, uploadStats } = usePhotoStore();
  const [files, setFiles] = useState([]);
  const [done, setDone] = useState(false);

  const handleUpload = async () => {
    if (!files.length) { toast.error('Select photos first'); return; }
    const result = await uploadPhotos(projectId, files);
    if (result.success) {
      setDone(true);
      toast.success(`${result.count} photos uploaded! AI analysis starting…`);
    } else {
      toast.error(result.message || 'Upload failed');
    }
  };

  if (done) return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-4">
      <div className="glass rounded-2xl border border-green-500/30 p-6 text-center">
        <CheckCircle size={40} className="text-green-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-white mb-1">Upload Complete!</h3>
        <p className="text-obsidian-400 text-sm">AI analysis is running in the background</p>
      </div>
      <div className="flex gap-3">
        <Button className="flex-1" onClick={() => navigate(`/dashboard/projects/${projectId}/results`)}>
          <Sparkles size={15}/> View Results
        </Button>
        <Button variant="outline" onClick={() => navigate(`/dashboard/projects/${projectId}`)}>Back</Button>
      </div>
    </motion.div>
  );

  if (isUploading) return (
    <div className="glass rounded-2xl border border-obsidian-700 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Loader2 size={20} className="text-gold-400 animate-spin"/>
        <div className="flex-1">
          <p className="text-sm font-medium text-white">
            Uploading batch {uploadStats.currentBatch} of {uploadStats.totalBatches}…
          </p>
          <p className="text-xs text-obsidian-400">{uploadStats.uploaded} / {uploadStats.total} photos</p>
        </div>
        <span className="text-gold-400 font-mono font-bold text-xl">{uploadProgress}%</span>
      </div>
      <div className="w-full bg-obsidian-700 rounded-full h-2 overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full"
          animate={{width:`${uploadProgress}%`}} />
      </div>
      <p className="text-xs text-obsidian-500">
        Sending in small batches — you can leave this page, analysis runs in background
      </p>
    </div>
  );

  return (
    <div className="space-y-4">
      <DropZone onFiles={setFiles} maxFiles={1000} />
      {files.length > 0 && (
        <div className="flex gap-3">
          <Button className="flex-1" size="lg" onClick={handleUpload}>
            <Upload size={16}/> Upload {files.length} Photo{files.length !== 1 ? 's' : ''}
            <span className="text-xs opacity-70 ml-1">({Math.ceil(files.length/20)} batches)</span>
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setFiles([])}>Clear</Button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function UploadPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('local');

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg text-obsidian-400 hover:text-white hover:bg-obsidian-800 transition-colors">
          <ArrowLeft size={18}/>
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Add Photos</h1>
          <p className="text-obsidian-400 text-sm">Choose how to bring in your shoot</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 p-1 bg-obsidian-800 rounded-xl border border-obsidian-700">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30'
                : 'text-obsidian-400 hover:text-white'
            }`}
          >
            <tab.icon size={16}/>
            <div className="text-left hidden sm:block">
              <div>{tab.label}</div>
              <div className="text-[10px] opacity-60 font-normal">{tab.desc}</div>
            </div>
            <span className="sm:hidden">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-8}}>
          {activeTab === 'local' && <LocalScanTab projectId={projectId} />}
          {activeTab === 'browser' && <BrowserUploadTab projectId={projectId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
