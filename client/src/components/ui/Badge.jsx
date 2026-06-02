import { cn } from '@/lib/utils';

const variants = {
  default: 'bg-obsidian-700 text-obsidian-200',
  gold: 'bg-gold-500/20 text-gold-400 border border-gold-500/30',
  green: 'bg-green-500/20 text-green-400 border border-green-500/30',
  red: 'bg-red-500/20 text-red-400 border border-red-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  orange: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
};

export default function Badge({ children, variant = 'default', className, ...props }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      variants[variant], className
    )} {...props}>
      {children}
    </span>
  );
}
