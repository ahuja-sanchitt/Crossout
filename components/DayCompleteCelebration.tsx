'use client';

import { useEffect, useMemo, useState } from 'react';

const AUTO_DISMISS_MS = 4000;
const PARTICLE_COUNT = 14;

export function DayCompleteCelebration({
  streak,
  onDismiss,
}: {
  streak: number;
  onDismiss: () => void;
}) {
  const [closing, setClosing] = useState(false);

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => {
        const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.3;
        const distance = 70 + Math.random() * 50;
        return {
          key: i,
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          delay: Math.random() * 120,
          color: i % 3 === 0 ? 'bg-amber' : i % 3 === 1 ? 'bg-accent' : 'bg-ink',
        };
      }),
    [],
  );

  function close() {
    setClosing(true);
    setTimeout(onDismiss, 150);
  }

  useEffect(() => {
    const timer = setTimeout(close, AUTO_DISMISS_MS);
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    window.addEventListener('keydown', handleKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={close}
      className={`fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/55 backdrop-blur-[2px] transition-opacity duration-150 ${
        closing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="celebrate-pop relative flex flex-col items-center rounded-xl border border-accent/40 bg-surface px-10 py-9 text-center shadow-2xl">
        <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
          <span className="celebrate-ring absolute inset-0 rounded-full border-2 border-accent" />
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-ink">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
              <path d="M5 13l5 5L19 7" />
            </svg>
          </span>
          {particles.map((p) => (
            <span
              key={p.key}
              className={`celebrate-particle absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full ${p.color}`}
              style={
                {
                  '--dx': `${p.dx}px`,
                  '--dy': `${p.dy}px`,
                  animationDelay: `${p.delay}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        <h2 className="text-xl font-semibold tracking-tight text-ink">Day crossed out</h2>
        <p className="mt-1 text-sm text-ink-muted">Every task, done.</p>

        <div className="mt-4 flex items-center gap-1.5 rounded-full border border-amber/30 bg-amber/10 px-3.5 py-1.5">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-amber">
            <path d="M10 1c1 3-2 4-2 7a2 2 0 004 0c1 1 2 2.5 2 4.5A5.5 5.5 0 018 17.5 5.5 5.5 0 013 12c0-3.5 2.5-5 3-8 1 1 1.5 2 1.5 3C8.5 4.5 9.5 3 10 1z" />
          </svg>
          <span className="num text-sm font-semibold text-amber">{streak}</span>
          <span className="text-sm text-ink-muted">day streak</span>
        </div>

        <button
          type="button"
          onClick={close}
          className="mt-6 text-xs text-ink-faint hover:text-ink"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
