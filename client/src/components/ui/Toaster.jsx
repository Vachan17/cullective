import { create } from 'zustand';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const useToastStore = create((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Date.now();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
      toast.duration || 4000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));

export const toast = {
  success: (message, opts) => useToastStore.getState().addToast({ type: 'success', message, ...opts }),
  error: (message, opts) => useToastStore.getState().addToast({ type: 'error', message, ...opts }),
  info: (message, opts) => useToastStore.getState().addToast({ type: 'info', message, ...opts }),
  warning: (message, opts) => useToastStore.getState().addToast({ type: 'warning', message, ...opts }),
};

const icons = {
  success: <CheckCircle size={16} className="text-green-400" />,
  error: <AlertCircle size={16} className="text-red-400" />,
  info: <Info size={16} className="text-blue-400" />,
  warning: <AlertTriangle size={16} className="text-orange-400" />,
};

const colors = {
  success: 'border-green-500/30',
  error: 'border-red-500/30',
  info: 'border-blue-500/30',
  warning: 'border-orange-500/30',
};

export function Toaster() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            className={`glass border ${colors[t.type]} rounded-xl px-4 py-3 flex items-start gap-3 min-w-[280px] max-w-[380px] pointer-events-auto shadow-xl`}
          >
            {icons[t.type]}
            <div className="flex-1 text-sm text-obsidian-100">{t.message}</div>
            <button onClick={() => removeToast(t.id)} className="text-obsidian-500 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default useToastStore;
