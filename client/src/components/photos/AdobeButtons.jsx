import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Monitor, Palette, ExternalLink, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { toast } from '@/components/ui/Toaster';
import api from '@/lib/api';

const tryProtocol = (protocol, url, onSuccess, onFail) => {
  // Attempt to open via protocol link. After 1.5s if tab is still visible, software not found.
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  let launched = false;
  const cleanup = () => { try { document.body.removeChild(iframe); } catch {} };

  const handleBlur = () => { launched = true; };
  window.addEventListener('blur', handleBlur);

  iframe.src = `${protocol}${url}`;

  setTimeout(() => {
    window.removeEventListener('blur', handleBlur);
    cleanup();
    if (!launched) onFail();
    else onSuccess();
  }, 1500);
};

export default function AdobeButtons({ photo }) {
  const [lrState, setLrState]   = useState('idle'); // idle | trying | ok | fail
  const [psState, setPsState]   = useState('idle');
  const [showFallback, setShowFallback] = useState(false);

  const openLightroom = async () => {
    setLrState('trying');
    try {
      await api.post('/photos/open-local', { photoId: photo._id, app: 'lightroom' });
      setLrState('ok');
      toast.success('Opened in Lightroom Classic');
    } catch (err) {
      setLrState('fail');
      toast.error(err.response?.data?.message || 'Failed to open in Lightroom Classic');
      setShowFallback(true);
    }
  };

  const openPhotoshop = async () => {
    setPsState('trying');
    try {
      await api.post('/photos/open-local', { photoId: photo._id, app: 'photoshop' });
      setPsState('ok');
      toast.success('Opened in Photoshop');
    } catch (err) {
      setPsState('fail');
      toast.error(err.response?.data?.message || 'Failed to open in Photoshop');
      setShowFallback(true);
    }
  };

  const copyPath = () => {
    navigator.clipboard.writeText(photo.url);
    toast.success('File path copied to clipboard');
  };

  const openRaw = () => window.open(photo.url, '_blank');

  const stateIcon = (state, defaultIcon) => {
    if (state === 'trying') return <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"/>;
    if (state === 'ok')     return <CheckCircle size={15}/>;
    if (state === 'fail')   return <AlertTriangle size={15}/>;
    return defaultIcon;
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          size="sm"
          className={`justify-center ${lrState === 'ok' ? 'border-green-500/40 text-green-400' : lrState === 'fail' ? 'border-orange-500/40 text-orange-400' : ''}`}
          onClick={openLightroom}
          disabled={lrState === 'trying'}
        >
          {stateIcon(lrState, <Monitor size={15} className="text-blue-400"/>)}
          <span className="text-xs">Open in Lightroom</span>
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className={`justify-center ${psState === 'ok' ? 'border-green-500/40 text-green-400' : psState === 'fail' ? 'border-orange-500/40 text-orange-400' : ''}`}
          onClick={openPhotoshop}
          disabled={psState === 'trying'}
        >
          {stateIcon(psState, <Palette size={15} className="text-purple-400"/>)}
          <span className="text-xs">Open in Photoshop</span>
        </Button>
      </div>

      {/* Fallback panel when protocol fails */}
      <AnimatePresence>
        {showFallback && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}}
            className="glass rounded-xl border border-orange-500/20 p-3 overflow-hidden">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle size={14} className="text-orange-400 flex-shrink-0 mt-0.5"/>
              <p className="text-xs text-obsidian-300 leading-relaxed">
                Adobe software not detected on this machine. You can:
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={copyPath}
                className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-obsidian-700 text-obsidian-300 hover:text-white hover:bg-obsidian-600 text-xs transition-colors">
                <Copy size={12}/> Copy file path
              </button>
              <button onClick={openRaw}
                className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-obsidian-700 text-obsidian-300 hover:text-white hover:bg-obsidian-600 text-xs transition-colors">
                <ExternalLink size={12}/> Open in browser
              </button>
            </div>
            <p className="text-[10px] text-obsidian-600 mt-2">
              Install <a href="https://www.adobe.com/products/photoshop-lightroom-classic.html" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Lightroom Classic</a> or <a href="https://www.adobe.com/products/photoshop.html" target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">Photoshop</a> to enable direct open.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
