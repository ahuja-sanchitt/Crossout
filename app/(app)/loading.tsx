import { PageHeaderSkeleton, Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <PageHeaderSkeleton />
        <div className="flex gap-2.5">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-40" />
        </div>
      </div>

      {[0, 1].map((g) => (
        <div key={g} className="mb-6">
          <Skeleton className="mb-2 h-3 w-16" />
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            {[0, 1, 2].map((r) => (
              <div key={r} className="flex items-center gap-2.5 border-b border-border-soft px-3.5 py-2.5 last:border-b-0">
                <Skeleton className="h-[17px] w-[17px] shrink-0 rounded-[5px]" />
                <Skeleton className="h-4 flex-1 max-w-[220px]" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
