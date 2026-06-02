import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export const Card = ({ className, children, hover = false, onClick, ...props }) => (
  <motion.div
    className={cn(
      'glass rounded-2xl border border-obsidian-700/50',
      hover && 'card-hover cursor-pointer',
      className
    )}
    whileHover={hover ? { y: -2 } : undefined}
    onClick={onClick}
    {...props}
  >
    {children}
  </motion.div>
);

export const CardHeader = ({ className, children, ...props }) => (
  <div className={cn('p-5 pb-0', className)} {...props}>{children}</div>
);

export const CardContent = ({ className, children, ...props }) => (
  <div className={cn('p-5', className)} {...props}>{children}</div>
);

export const CardFooter = ({ className, children, ...props }) => (
  <div className={cn('p-5 pt-0 flex items-center', className)} {...props}>{children}</div>
);
