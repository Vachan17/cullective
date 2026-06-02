import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const variants = {
  default: 'bg-gold-500 hover:bg-gold-400 text-obsidian-900 font-semibold shadow-lg shadow-gold-500/20',
  outline: 'border border-gold-500/40 text-gold-400 hover:bg-gold-500/10 hover:border-gold-400',
  ghost: 'text-obsidian-300 hover:bg-obsidian-800 hover:text-white',
  danger: 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30',
  secondary: 'bg-obsidian-800 hover:bg-obsidian-700 text-white border border-obsidian-600',
  glass: 'glass text-white hover:border-gold-500/40',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
  xl: 'px-8 py-4 text-lg rounded-2xl',
  icon: 'p-2 rounded-xl',
};

const Button = forwardRef(({
  className, variant = 'default', size = 'md',
  children, disabled, isLoading, ...props
}, ref) => {
  return (
    <motion.button
      ref={ref}
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.97 }}
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </motion.button>
  );
});

Button.displayName = 'Button';
export default Button;
