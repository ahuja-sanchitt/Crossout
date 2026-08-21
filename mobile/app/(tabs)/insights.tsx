import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { WEB_APP_URL } from '@/lib/config';
import { colors } from '@/lib/theme';
import type { InsightRow } from '@/lib/types';

export default function InsightsScreen() {
  const { session } = useSession();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insight, setInsight] = useState<InsightRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);

    if (!WEB_APP_URL) {
      setError('Set EXPO_PUBLIC_WEB_APP_URL to your deployed web app to enable insights.');
      return;
    }

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setError('Not signed in.');
      return;
    }

    try {
      const res = await fetch(`${WEB_APP_URL}/api/insights`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `Request failed (${res.status})`);
        return;
      }
      setInsight(await res.json());
    } catch {
      setError('Could not reach the web app — check EXPO_PUBLIC_WEB_APP_URL and your connection.');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  const snapshot = insight?.stats_snapshot;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Text style={styles.eyebrow}>THIS WEEK</Text>
        <Text style={styles.title}>Insights</Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>{insight ? `Generated ${insight.date}` : 'Insight'}</Text>
          <Text style={styles.heroText}>{insight ? insight.content : error}</Text>
        </View>

        {snapshot && (
          <View style={styles.statsRow}>
            <StatTile value={`${Math.round(snapshot.completionRate * 100)}%`} label="7-day rate" />
            <StatTile value={snapshot.emergencyPassesUsed} label="passes used" />
            <StatTile value={snapshot.currentStreak} label="day streak" amber />
          </View>
        )}

        {!WEB_APP_URL && (
          <Text style={styles.hint}>
            Add EXPO_PUBLIC_WEB_APP_URL to your .env, pointing at the deployed web app (or your machine&apos;s LAN
            IP for local dev), then reload.
          </Text>
        )}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 18, paddingBottom: 40 },
  eyebrow: { color: colors.inkFaint, fontSize: 11, letterSpacing: 1 },
  title: { color: colors.ink, fontSize: 22, fontWeight: '700', marginTop: 4, marginBottom: 18 },
  heroCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 18 },
  heroLabel: { color: colors.inkFaint, fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  heroText: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statTile: { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 12 },
  statValue: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  statLabel: { color: colors.inkMuted, fontSize: 11, marginTop: 2 },
  hint: { color: colors.inkFaint, fontSize: 12, marginTop: 18, lineHeight: 18 },
});
