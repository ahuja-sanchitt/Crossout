'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/app/(app)/actions';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Today',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="4" width="14" height="13" rx="2" />
        <path d="M3 8h14" />
        <path d="M7 2v4M13 2v4" />
      </svg>
    ),
  },
  {
    href: '/calendar',
    label: 'Calendar',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="4" width="14" height="13" rx="2" />
        <path d="M3 8h14" />
        <circle cx="7" cy="12" r="1" />
        <circle cx="10" cy="12" r="1" />
        <circle cx="13" cy="12" r="1" />
      </svg>
    ),
  },
  {
    href: '/insights',
    label: 'Insights',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 16V9M10 16V4M16 16v-6" />
      </svg>
    ),
  },
  {
    href: '/tasks',
    label: 'Tasks',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 6h12M4 10h12M4 14h8" />
      </svg>
    ),
  },
];

export function Sidebar({
  currentStreak,
  passesRemaining,
}: {
  currentStreak: number;
  passesRemaining: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-56 flex-col gap-7 border-r border-border bg-surface-sunken p-4">
      <div className="flex items-center gap-2 px-1">
        <div className="relative h-5 w-5 rounded border-[1.6px] border-accent">
          <span className="absolute left-[3px] top-[8px] h-[1.6px] w-[10px] -rotate-[18deg] bg-accent" />
        </div>
        <span className="text-[0.95rem] font-semibold tracking-tight">Crossout</span>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[0.87rem] ${
                active ? 'bg-accent/10 font-semibold text-accent' : 'text-ink-muted hover:text-ink'
              }`}
            >
              <span className={`h-[15px] w-[15px] ${active ? 'text-accent' : 'text-ink-faint'}`}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <div className="rounded-lg border border-border bg-surface-raised px-3.5 py-3">
          <div className="flex items-baseline gap-1.5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="mr-0.5 h-[15px] w-[15px] text-amber">
              <path d="M10 1c1 3-2 4-2 7a2 2 0 004 0c1 1 2 2.5 2 4.5A5.5 5.5 0 018 17.5 5.5 5.5 0 013 12c0-3.5 2.5-5 3-8 1 1 1.5 2 1.5 3C8.5 4.5 9.5 3 10 1z" />
            </svg>
            <span className="num text-[1.3rem] font-semibold text-amber">{currentStreak}</span>
            <span className="text-[0.78rem] text-ink-muted">day streak</span>
          </div>
          <div className="mt-1 text-[0.74rem] text-ink-faint">{passesRemaining} emergency passes left</div>
        </div>

        <form action={signOut}>
          <button type="submit" className="px-2.5 text-left text-[0.8rem] text-ink-faint hover:text-ink">
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
