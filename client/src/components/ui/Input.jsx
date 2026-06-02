import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Input = forwardRef(({ className, label, error, icon, ...props }, ref) => (
  <div className="space-y-1.5">
    {label && <label className="text-sm font-medium text-obsidian-300">{label}</label>}
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-obsidian-400">{icon}</div>}
      <input
        ref={ref}
        className={cn(
          'w-full bg-obsidian-800 border border-obsidian-600 rounded-xl px-4 py-2.5 text-sm text-white',
          'placeholder:text-obsidian-500 transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:border-gold-500/60',
          'hover:border-obsidian-500',
          icon && 'pl-10',
          error && 'border-red-500/60 focus:ring-red-500/30',
          className
        )}
        {...props}
      />
    </div>
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
));

Input.displayName = 'Input';
export default Input;
