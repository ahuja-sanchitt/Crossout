import { PageHeaderSkeleton, Skeleton } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div>
      <PageHeaderSkeleton />
      <Skeleton className="mb-6 h-24" />
      <Skeleton className="mb-6 h-[150px]" />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[70px]" />
        ))}
      </div>
    </div>
  );
}
