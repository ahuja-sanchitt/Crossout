import Link from 'next/link';
import { signUp } from './actions';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-5 w-5 rounded border-[1.6px] border-accent" />
          <span className="text-sm font-semibold">Crossout</span>
        </div>

        <h1 className="mb-1 text-xl font-semibold">Create your account</h1>
        <p className="mb-6 text-sm text-ink-muted">One account — this is a personal tracker.</p>

        {params.error && (
          <p className="mb-4 rounded border border-red/30 bg-red/10 px-3 py-2 text-sm text-red">
            {params.error}
          </p>
        )}

        <form action={signUp} className="flex flex-col gap-3">
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
              minLength={8}
              autoComplete="new-password"
              className="rounded border border-border bg-surface-raised px-3 py-2 text-ink outline-none focus:border-accent"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded bg-accent px-3 py-2 text-sm font-semibold text-accent-ink"
          >
            Sign up
          </button>
        </form>

        <p className="mt-5 text-sm text-ink-faint">
          Already have an account?{' '}
          <Link href="/login" className="text-accent">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
