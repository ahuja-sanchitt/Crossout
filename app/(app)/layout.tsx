import { createClient } from '@/lib/supabase/server';
import { getStreakSummary } from '@/lib/streak';
import { getRemainingEmergencyPasses } from '@/lib/emergencyPass';
import { todayString } from '@/lib/today';
import { Sidebar } from '@/components/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // middleware already redirects unauthenticated requests to /login, but
  // narrow the type here so the rest of the tree can assume a user exists.
  if (!user) return null;

  const today = todayString();
  const [{ currentStreak }, passesRemaining] = await Promise.all([
    getStreakSummary(supabase, user.id, today),
    getRemainingEmergencyPasses(supabase, user.id),
  ]);

  return (
    <div className="flex min-h-screen">
      <Sidebar currentStreak={currentStreak} passesRemaining={passesRemaining} />
      <main className="max-w-[980px] flex-1 px-9 pb-14 pt-8">{children}</main>
    </div>
  );
}
