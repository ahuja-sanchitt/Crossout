'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton({
  children,
  pendingText,
  className,
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-70`}>
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 animate-spin" aria-hidden="true">
            <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
            <path d="M17.5 10a7.5 7.5 0 00-7.5-7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          {pendingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
