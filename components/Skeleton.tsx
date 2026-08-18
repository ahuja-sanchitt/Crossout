export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-raised ${className}`} />;
}

export function PageHeaderSkeleton() {
  return (
    <div className="mb-7">
      <Skeleton className="mb-2 h-3 w-24" />
      <Skeleton className="h-7 w-40" />
    </div>
  );
}
