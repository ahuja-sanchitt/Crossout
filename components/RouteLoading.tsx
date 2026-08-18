import { Spinner } from '@/components/Spinner';

export function RouteLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-ink-muted">
      <Spinner className="h-6 w-6 text-accent" />
      <span className="text-[0.85rem]">{label}</span>
    </div>
  );
}
