import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { generateInstancesForDate } from '@/lib/instances';
import { getRemainingEmergencyPasses, useEmergencyPass, EmergencyPassLimitError } from '@/lib/emergencyPass';
import { getStreakSummary } from '@/lib/streak';
import { todayString } from '@/lib/today';
import { TIME_OF_DAY_LABEL, TIME_OF_DAY_ORDER, currentTimeOfDay } from '@/lib/timeOfDay';
import { colors, priorityDot } from '@/lib/theme';
import type { DayStatus, Priority, TimeOfDay } from '@/lib/types';

interface TodayInstance {
  instanceId: string;
  taskId: string;
  title: string;
  priority: Priority;
  category: string | null;
  timeOfDay: TimeOfDay;
  completed: boolean;
}

interface PendingInstance {
  instanceId: string;
  title: string;
  priority: Priority;
  category: string | null;
  date: string;
  daysOverdue: number;
}

export default function TodayScreen() {
  const { session } = useSession();
  const userId = session?.user.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [instances, setInstances] = useState<TodayInstance[]>([]);
  const [pending, setPending] = useState<PendingInstance[]>([]);
  const [dayStatus, setDayStatus] = useState<DayStatus>('incomplete');
  const [passesRemaining, setPassesRemaining] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const [celebration, setCelebration] = useState<number | null>(null);
  const wasAllDone = useRef(false);

  const today = todayString();

  const load = useCallback(async () => {
    if (!userId) return;

    const tomorrow = new Date(`${today}T00:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    await Promise.all([
      generateInstancesForDate(supabase, userId, today),
      generateInstancesForDate(supabase, userId, tomorrow.toISOString().slice(0, 10)),
    ]);

    const sixtyAgo = new Date(`${today}T00:00:00Z`);
    sixtyAgo.setUTCDate(sixtyAgo.getUTCDate() - 60);

    const [instancesRes, pendingRes, dayRes, passes, streak] = await Promise.all([
      supabase
        .from('task_instances')
        .select('id, task_id, completed_at, tasks(title, priority, category, time_of_day)')
        .eq('user_id', userId)
        .eq('date', today),
      supabase
        .from('task_instances')
        .select('id, task_id, date, completed_at, tasks(title, priority, category, recurrence_rule)')
        .eq('user_id', userId)
        .lt('date', today)
        .gte('date', sixtyAgo.toISOString().slice(0, 10))
        .is('completed_at', null),
      supabase.from('days').select('status').eq('user_id', userId).eq('date', today).maybeSingle(),
      getRemainingEmergencyPasses(supabase, userId),
      getStreakSummary(supabase, userId, today),
    ]);

    const rows = (instancesRes.data ?? []) as any[];
    setInstances(
      rows.map((r) => {
        const t = Array.isArray(r.tasks) ? r.tasks[0] : r.tasks;
        return {
          instanceId: r.id,
          taskId: r.task_id,
          title: t?.title ?? '(deleted task)',
          priority: (t?.priority ?? 'med') as Priority,
          category: t?.category ?? null,
          timeOfDay: (t?.time_of_day ?? 'morning') as TimeOfDay,
          completed: Boolean(r.completed_at),
        };
      }),
    );

    const pendingRows = ((pendingRes.data ?? []) as any[]).filter((r) => {
      const t = Array.isArray(r.tasks) ? r.tasks[0] : r.tasks;
      return t && !t.recurrence_rule;
    });
    const todayMs = new Date(`${today}T00:00:00Z`).getTime();
    setPending(
      pendingRows
        .map((r) => {
          const t = Array.isArray(r.tasks) ? r.tasks[0] : r.tasks;
          return {
            instanceId: r.id,
            title: t?.title ?? '(deleted task)',
            priority: (t?.priority ?? 'med') as Priority,
            category: t?.category ?? null,
            date: r.date,
            daysOverdue: Math.round((todayMs - new Date(`${r.date}T00:00:00Z`).getTime()) / 86400000),
          };
        })
        .sort((a, b) => (a.date < b.date ? -1 : 1)),
    );

    setDayStatus((dayRes.data?.status as DayStatus) ?? 'incomplete');
    setPassesRemaining(passes);
    setCurrentStreak(streak.currentStreak);
    wasAllDone.current = (dayRes.data?.status ?? 'incomplete') !== 'incomplete';
  }, [userId, today]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function toggleInstance(instanceId: string, next: boolean) {
    setInstances((prev) => {
      const updated = prev.map((i) => (i.instanceId === instanceId ? { ...i, completed: next } : i));
      const allDone = updated.length > 0 && updated.every((i) => i.completed);
      if (allDone && !wasAllDone.current) {
        setCelebration(currentStreak + 1);
      }
      wasAllDone.current = allDone;
      return updated;
    });

    await supabase
      .from('task_instances')
      .update({ completed_at: next ? new Date().toISOString() : null })
      .eq('id', instanceId);
  }

  async function completePending(instanceId: string) {
    setPending((prev) => prev.filter((p) => p.instanceId !== instanceId));
    await supabase.from('task_instances').update({ completed_at: new Date().toISOString() }).eq('id', instanceId);
  }

  async function handleAddTask(title: string, timeOfDay: TimeOfDay, priority: Priority, category: string) {
    if (!userId || !title.trim()) return;
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        title: title.trim(),
        time_of_day: timeOfDay,
        priority,
        category: category.trim() || null,
        due_date: today,
      })
      .select('id')
      .single();
    if (error || !task) return;
    await supabase.from('task_instances').insert({ task_id: task.id, user_id: userId, date: today });
    setAddOpen(false);
    await load();
  }

  async function handleEmergencyPass(note: string) {
    if (!userId) return;
    try {
      await useEmergencyPass(supabase, userId, today, note.trim() || undefined);
      setPassOpen(false);
      await load();
    } catch (err) {
      if (!(err instanceof EmergencyPassLimitError)) throw err;
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  const total = instances.length;
  const done = instances.filter((i) => i.completed).length;
  const groups = TIME_OF_DAY_ORDER.map((tod) => ({
    tod,
    items: instances.filter((i) => i.timeOfDay === tod),
  })).filter((g) => g.items.length > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {celebration !== null && <CelebrationOverlay streak={celebration} onDismiss={() => setCelebration(null)} />}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <Text style={styles.dateLabel}>
          {new Date(`${today}T00:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' })}
        </Text>
        <Text style={styles.title}>Today</Text>

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: total ? `${(done / total) * 100}%` : '0%' }]} />
          </View>
          <Text style={styles.progressText}>
            {dayStatus === 'excused' ? 'Excused today' : `${done} of ${total} done`}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={styles.addButton} onPress={() => setAddOpen(true)}>
            <Text style={styles.addButtonText}>+ Add task</Text>
          </Pressable>
          {passesRemaining > 0 && dayStatus !== 'complete' && dayStatus !== 'excused' && (
            <Pressable style={styles.passButton} onPress={() => setPassOpen(true)}>
              <Text style={styles.passButtonText}>🛡 Emergency pass ({passesRemaining})</Text>
            </Pressable>
          )}
        </View>

        {pending.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.pendingLabel}>PENDING · {pending.length}</Text>
            <Text style={styles.sectionSubtitle}>Not on today&apos;s list, but not forgotten.</Text>
            {pending.map((item) => (
              <View key={item.instanceId} style={styles.pendingCard}>
                <View style={styles.taskRowTop}>
                  <Pressable style={styles.checkbox} onPress={() => completePending(item.instanceId)} />
                  <View style={[styles.dot, { backgroundColor: priorityDot[item.priority] }]} />
                  <Text style={styles.taskTitle}>{item.title}</Text>
                </View>
                <View style={styles.pendingMeta}>
                  <Text style={styles.overdueBadge}>
                    {item.daysOverdue === 1 ? '1 day overdue' : `${item.daysOverdue} days overdue`}
                  </Text>
                  {item.category && <Text style={styles.metaText}>{item.category}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {groups.length === 0 && <Text style={styles.emptyText}>Nothing scheduled yet — add a task to get started.</Text>}

        {groups.map((group) => (
          <View key={group.tod} style={styles.section}>
            <Text style={styles.sectionLabel}>{TIME_OF_DAY_LABEL[group.tod].toUpperCase()}</Text>
            <View style={styles.taskList}>
              {group.items.map((item) => (
                <View key={item.instanceId} style={styles.taskRow}>
                  <Pressable
                    style={[styles.checkbox, item.completed && styles.checkboxDone]}
                    onPress={() => toggleInstance(item.instanceId, !item.completed)}
                  >
                    {item.completed && <Text style={styles.checkmark}>✓</Text>}
                  </Pressable>
                  <View style={[styles.dot, { backgroundColor: priorityDot[item.priority] }]} />
                  <Text style={[styles.taskTitle, item.completed && styles.taskTitleDone]}>{item.title}</Text>
                  {item.category && <Text style={styles.metaText}>{item.category}</Text>}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <AddTaskModal visible={addOpen} onClose={() => setAddOpen(false)} onSubmit={handleAddTask} />
      <EmergencyPassModal visible={passOpen} onClose={() => setPassOpen(false)} onSubmit={handleEmergencyPass} />
    </SafeAreaView>
  );
}

function CelebrationOverlay({ streak, onDismiss }: { streak: number; onDismiss: () => void }) {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [scale, opacity, onDismiss]);

  return (
    <Pressable style={styles.overlayBackdrop} onPress={onDismiss}>
      <Animated.View style={[styles.overlayCard, { transform: [{ scale }], opacity }]}>
        <View style={styles.overlayCheck}>
          <Text style={styles.overlayCheckText}>✓</Text>
        </View>
        <Text style={styles.overlayTitle}>Day crossed out</Text>
        <Text style={styles.overlaySubtitle}>Every task, done.</Text>
        <View style={styles.overlayStreak}>
          <Text style={styles.overlayStreakText}>🔥 {streak} day streak</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function AddTaskModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (title: string, timeOfDay: TimeOfDay, priority: Priority, category: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(currentTimeOfDay(new Date().getHours()));
  const [priority, setPriority] = useState<Priority>('med');
  const [category, setCategory] = useState('');

  function reset() {
    setTitle('');
    setCategory('');
    setPriority('med');
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>New task for today</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="What do you need to do?"
            placeholderTextColor={colors.inkFaint}
            autoFocus
          />

          <Text style={styles.modalLabel}>When</Text>
          <View style={styles.segmented}>
            {TIME_OF_DAY_ORDER.map((tod) => (
              <Pressable
                key={tod}
                style={[styles.segmentOption, timeOfDay === tod && styles.segmentOptionActive]}
                onPress={() => setTimeOfDay(tod)}
              >
                <Text style={[styles.segmentText, timeOfDay === tod && styles.segmentTextActive]}>{TIME_OF_DAY_LABEL[tod]}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Priority</Text>
          <View style={styles.segmented}>
            {(['low', 'med', 'high'] as Priority[]).map((p) => (
              <Pressable key={p} style={[styles.segmentOption, priority === p && styles.segmentOptionActive]} onPress={() => setPriority(p)}>
                <Text style={[styles.segmentText, priority === p && styles.segmentTextActive]}>{p}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={[styles.input, { marginTop: 12 }]}
            value={category}
            onChangeText={setCategory}
            placeholder="Category (optional)"
            placeholderTextColor={colors.inkFaint}
          />

          <View style={styles.modalActions}>
            <Pressable
              style={styles.modalPrimary}
              onPress={() => {
                onSubmit(title, timeOfDay, priority, category);
                reset();
              }}
            >
              <Text style={styles.modalPrimaryText}>Add</Text>
            </Pressable>
            <Pressable
              style={styles.modalSecondary}
              onPress={() => {
                reset();
                onClose();
              }}
            >
              <Text style={styles.modalSecondaryText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function EmergencyPassModal({
  visible,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState('');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Use emergency pass?</Text>
          <Text style={styles.sectionSubtitle}>Keeps your streak alive without marking today complete.</Text>
          <TextInput
            style={[styles.input, { marginTop: 12 }]}
            value={note}
            onChangeText={setNote}
            placeholder="Optional note"
            placeholderTextColor={colors.inkFaint}
          />
          <View style={styles.modalActions}>
            <Pressable
              style={styles.modalPrimaryAmber}
              onPress={() => {
                onSubmit(note);
                setNote('');
              }}
            >
              <Text style={styles.modalPrimaryText}>Confirm</Text>
            </Pressable>
            <Pressable style={styles.modalSecondary} onPress={onClose}>
              <Text style={styles.modalSecondaryText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 18, paddingBottom: 40 },
  dateLabel: { color: colors.inkFaint, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  title: { color: colors.ink, fontSize: 26, fontWeight: '700' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  progressTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.borderSoft, overflow: 'hidden', maxWidth: 160 },
  progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
  progressText: { color: colors.inkMuted, fontSize: 12 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 18, flexWrap: 'wrap' },
  addButton: { backgroundColor: colors.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  addButtonText: { color: colors.accentInk, fontWeight: '700', fontSize: 13 },
  passButton: { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
  passButtonText: { color: colors.amber, fontSize: 13 },
  section: { marginTop: 24 },
  sectionLabel: { color: colors.inkMuted, fontSize: 11, letterSpacing: 1, marginBottom: 8 },
  pendingLabel: { color: colors.amber, fontSize: 11, letterSpacing: 1, marginBottom: 4 },
  sectionSubtitle: { color: colors.inkFaint, fontSize: 11, marginBottom: 10 },
  emptyText: { color: colors.inkFaint, fontSize: 13, marginTop: 20 },
  taskList: { backgroundColor: colors.surface, borderRadius: 10, borderColor: colors.border, borderWidth: 1, overflow: 'hidden' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomColor: colors.borderSoft, borderBottomWidth: 1 },
  taskRowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pendingCard: { backgroundColor: colors.surface, borderColor: 'rgba(227,171,95,0.25)', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 8 },
  pendingMeta: { flexDirection: 'row', gap: 8, marginTop: 8, marginLeft: 27, flexWrap: 'wrap' },
  overdueBadge: { color: colors.amber, fontSize: 11, borderColor: 'rgba(227,171,95,0.35)', borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: 'rgba(227,171,95,0.1)' },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: colors.inkFaint, alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkmark: { color: colors.accentInk, fontSize: 11, fontWeight: '900' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  taskTitle: { flex: 1, color: colors.ink, fontSize: 14 },
  taskTitleDone: { color: colors.inkFaint, textDecorationLine: 'line-through' },
  metaText: { color: colors.inkFaint, fontSize: 11 },
  overlayBackdrop: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
  overlayCard: { backgroundColor: colors.surface, borderColor: 'rgba(79,191,159,0.4)', borderWidth: 1, borderRadius: 16, paddingVertical: 32, paddingHorizontal: 36, alignItems: 'center' },
  overlayCheck: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  overlayCheckText: { color: colors.accentInk, fontSize: 30, fontWeight: '900' },
  overlayTitle: { color: colors.ink, fontSize: 20, fontWeight: '700' },
  overlaySubtitle: { color: colors.inkMuted, fontSize: 13, marginTop: 4 },
  overlayStreak: { marginTop: 16, backgroundColor: 'rgba(227,171,95,0.1)', borderColor: 'rgba(227,171,95,0.3)', borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  overlayStreakText: { color: colors.amber, fontWeight: '700', fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 32 },
  modalTitle: { color: colors.ink, fontSize: 17, fontWeight: '700', marginBottom: 14 },
  modalLabel: { color: colors.inkMuted, fontSize: 11, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontSize: 14 },
  segmented: { flexDirection: 'row', gap: 8 },
  segmentOption: { flex: 1, borderColor: colors.border, borderWidth: 1, borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  segmentOptionActive: { backgroundColor: 'rgba(79,191,159,0.12)', borderColor: 'rgba(79,191,159,0.4)' },
  segmentText: { color: colors.inkMuted, fontSize: 12, textTransform: 'capitalize' },
  segmentTextActive: { color: colors.accent, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 22, alignItems: 'center' },
  modalPrimary: { backgroundColor: colors.accent, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 8 },
  modalPrimaryAmber: { backgroundColor: colors.amber, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 8 },
  modalPrimaryText: { color: colors.accentInk, fontWeight: '700', fontSize: 13 },
  modalSecondary: { paddingHorizontal: 8, paddingVertical: 11 },
  modalSecondaryText: { color: colors.inkFaint, fontSize: 13 },
});
