import Link from 'next/link';
import { signIn } from './actions';
import { SubmitButton } from '@/components/SubmitButton';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; justSignedUp?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-5 w-5 rounded border-[1.6px] border-accent" />
          <span className="text-sm font-semibold">Crossout</span>
        </div>

        <h1 className="mb-1 text-xl font-semibold">Log in</h1>
        <p className="mb-6 text-sm text-ink-muted">Pick up where you left off.</p>

        {params.justSignedUp && (
          <p className="mb-4 rounded border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
            Account created — check your email if confirmation is required, then log in.
          </p>
        )}
        {params.error && (
          <p className="mb-4 rounded border border-red/30 bg-red/10 px-3 py-2 text-sm text-red">
            {params.error}
          </p>
        )}

        <form action={signIn} className="flex flex-col gap-3">
          <input type="hidden" name="next" value={params.next ?? '/'} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="rounded border border-border bg-surface-raised px-3 py-2 text-ink outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Password</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="rounded border border-border bg-surface-raised px-3 py-2 text-ink outline-none focus:border-accent"
            />
          </label>
          <SubmitButton
            pendingText="Logging in…"
            className="mt-2 rounded bg-accent px-3 py-2 text-sm font-semibold text-accent-ink"
          >
            Log in
          </SubmitButton>
        </form>

        <p className="mt-5 text-sm text-ink-faint">
          No account?{' '}
          <Link href="/signup" className="text-accent">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
