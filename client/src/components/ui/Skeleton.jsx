import { cn } from '@/lib/utils';

export default function Skeleton({ className, ...props }) {
  return <div className={cn('shimmer rounded-lg', className)} {...props} />;
}

export function PhotoSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass rounded-2xl p-5 space-y-3">
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}
