import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { getStreakSummary } from '@/lib/streak';
import { todayString } from '@/lib/today';
import { colors } from '@/lib/theme';
import type { DayStatus } from '@/lib/types';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function monthBounds(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  return { first, last };
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function CalendarScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const today = todayString();
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)));
  const [loading, setLoading] = useState(true);
  const [statusByDate, setStatusByDate] = useState<Map<string, DayStatus>>(new Map());
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0 });

  const load = useCallback(async () => {
    if (!userId) return;
    const { first, last } = monthBounds(year, month);
    const [{ data }, streakSummary] = await Promise.all([
      supabase.from('days').select('date, status').eq('user_id', userId).gte('date', toDateStr(first)).lte('date', toDateStr(last)),
      getStreakSummary(supabase, userId, today),
    ]);
    setStatusByDate(new Map((data ?? []).map((d) => [d.date, d.status as DayStatus])));
    setStreak(streakSummary);
  }, [userId, year, month, today]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth() + 1);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  const { first, last } = monthBounds(year, month);
  const leadingBlanks = first.getUTCDay();
  const daysInMonth = last.getUTCDate();
  const monthLabel = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const cells: { date: string; day: number; status: DayStatus | null; isFuture: boolean; isToday: boolean }[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = toDateStr(new Date(Date.UTC(year, month - 1, day)));
    cells.push({ date, day, status: statusByDate.get(date) ?? null, isFuture: date > today, isToday: date === today });
  }
  const considered = cells.filter((c) => !c.isFuture);
  const completeCount = considered.filter((c) => c.status === 'complete' || c.status === 'excused').length;
  const rate = considered.length ? Math.round((completeCount / considered.length) * 100) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <Text style={styles.title}>Calendar</Text>
          </View>
          <View style={styles.navRow}>
            <Pressable style={styles.navButton} onPress={() => shiftMonth(-1)}>
              <Text style={styles.navButtonText}>‹</Text>
            </Pressable>
            <Pressable
              style={styles.navButton}
              onPress={() => {
                setYear(Number(today.slice(0, 4)));
                setMonth(Number(today.slice(5, 7)));
              }}
            >
              <Text style={styles.navButtonTextSmall}>Today</Text>
            </Pressable>
            <Pressable style={styles.navButton} onPress={() => shiftMonth(1)}>
              <Text style={styles.navButtonText}>›</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.grid}>
          {DOW.map((l, i) => (
            <Text key={i} style={styles.dowLabel}>
              {l}
            </Text>
          ))}
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <View key={`b${i}`} style={styles.cellBlank} />
          ))}
          {cells.map((cell) => {
            const isComplete = cell.status === 'complete';
            const isExcused = cell.status === 'excused';
            const isMissed = !cell.isFuture && !isComplete && !isExcused && !cell.isToday;
            return (
              <View
                key={cell.date}
                style={[
                  styles.cell,
                  isComplete && styles.cellComplete,
                  isExcused && styles.cellExcused,
                  isMissed && styles.cellMissed,
                  cell.isToday && styles.cellToday,
                ]}
              >
                <Text
                  style={[
                    styles.cellDay,
                    cell.isFuture && styles.cellDayFuture,
                    isMissed && styles.cellDayMissed,
                    cell.isToday && styles.cellDayToday,
                  ]}
                >
                  {cell.day}
                </Text>
                {isComplete && <Text style={styles.cellMark}>✓</Text>}
                {isExcused && <Text style={styles.cellMarkAmber}>🛡</Text>}
                {isMissed && <Text style={styles.cellMarkRed}>✕</Text>}
              </View>
            );
          })}
        </View>

        <View style={styles.legendRow}>
          <Text style={styles.legendItem}>✓ Complete</Text>
          <Text style={styles.legendItemAmber}>🛡 Excused</Text>
          <Text style={styles.legendItemRed}>✕ Missed</Text>
        </View>

        <View style={styles.statsRow}>
          <StatTile value={streak.currentStreak} label="current streak" amber />
          <StatTile value={streak.longestStreak} label="longest streak" />
          <StatTile value={`${rate}%`} label="complete rate" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({ value, label, amber }: { value: number | string; label: string; amber?: boolean }) {
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statValue, amber && { color: colors.amber }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const CELL_SIZE = '13.5%' as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 18, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 },
  monthLabel: { color: colors.inkFaint, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 22, fontWeight: '700', marginTop: 4 },
  navRow: { flexDirection: 'row', gap: 6, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 8, padding: 4 },
  navButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  navButtonText: { color: colors.inkMuted, fontSize: 16 },
  navButtonTextSmall: { color: colors.inkMuted, fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: '1%', marginBottom: 20 },
  dowLabel: { width: CELL_SIZE, textAlign: 'center', color: colors.inkFaint, fontSize: 10, marginBottom: 6 },
  cellBlank: { width: CELL_SIZE, aspectRatio: 1, opacity: 0.3, backgroundColor: colors.surfaceSunken, borderRadius: 6 },
  cell: { width: CELL_SIZE, aspectRatio: 1, borderRadius: 6, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 2 },
  cellComplete: { backgroundColor: 'rgba(79,191,159,0.1)' },
  cellExcused: { backgroundColor: 'rgba(227,171,95,0.1)' },
  cellMissed: { backgroundColor: 'rgba(214,131,114,0.08)' },
  cellToday: { borderWidth: 1.5, borderColor: colors.accent },
  cellDay: { color: colors.inkMuted, fontSize: 12, fontWeight: '600' },
  cellDayFuture: { color: colors.inkFaint, opacity: 0.5 },
  cellDayMissed: { color: colors.red },
  cellDayToday: { color: colors.accent, fontWeight: '800' },
  cellMark: { color: colors.accent, fontSize: 11 },
  cellMarkAmber: { fontSize: 10 },
  cellMarkRed: { color: colors.red, fontSize: 10 },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  legendItem: { color: colors.inkMuted, fontSize: 12 },
  legendItemAmber: { color: colors.amber, fontSize: 12 },
  legendItemRed: { color: colors.red, fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statTile: { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 12 },
  statValue: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  statLabel: { color: colors.inkMuted, fontSize: 11, marginTop: 2 },
});
