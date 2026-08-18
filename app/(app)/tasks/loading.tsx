import { PageHeaderSkeleton, Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <PageHeaderSkeleton />
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <Skeleton className="h-9 rounded-none" />
        {[0, 1, 2, 3, 4].map((r) => (
          <div key={r} className="flex items-center gap-3 border-b border-border-soft px-4 py-3 last:border-b-0">
            <Skeleton className="h-4 flex-1 max-w-[260px]" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
