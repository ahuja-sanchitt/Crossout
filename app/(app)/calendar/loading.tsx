import { PageHeaderSkeleton, Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />

      <div className="mb-7 grid grid-cols-7 gap-1.5">
        {Array.from({ length: 28 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[70px]" />
        ))}
      </div>
    </div>
  );
}
