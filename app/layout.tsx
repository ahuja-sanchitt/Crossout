import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Crossout',
  description: 'A daily task tracker with streaks and AI insights',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
