import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/useSession';
import { generateInstancesForDate } from '@/lib/instances';
import { todayString } from '@/lib/today';
import { TIME_OF_DAY_LABEL, TIME_OF_DAY_ORDER } from '@/lib/timeOfDay';
import { colors, priorityDot } from '@/lib/theme';
import type { Priority, RecurrenceRule, TimeOfDay } from '@/lib/types';

interface TaskItem {
  id: string;
  title: string;
  category: string | null;
  priority: Priority;
  timeOfDay: TimeOfDay;
  dueDate: string | null;
  recurrenceRule: RecurrenceRule | null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function recurrenceLabel(rule: RecurrenceRule | null): string | null {
  if (!rule) return null;
  if (rule.freq === 'daily') return 'daily';
  return rule.days.map((d) => WEEKDAYS[d]).join('/');
}

export default function TasksScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const today = todayString();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TaskItem | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('tasks')
      .select('id, title, category, priority, time_of_day, due_date, recurrence_rule')
      .eq('user_id', userId)
      .eq('is_active', true)
      .is('parent_task_id', null)
      .order('created_at', { ascending: false });
    setTasks(
      (data ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        priority: t.priority,
        timeOfDay: t.time_of_day,
        dueDate: t.due_date,
        recurrenceRule: t.recurrence_rule,
      })),
    );
  }, [userId]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function handleDelete(task: TaskItem) {
    Alert.alert('Delete task?', `"${task.title}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setTasks((prev) => prev.filter((t) => t.id !== task.id));
          await supabase.from('tasks').delete().eq('id', task.id);
        },
      },
    ]);
  }

  async function handleSave(fields: {
    title: string;
    category: string;
    priority: Priority;
    timeOfDay: TimeOfDay;
    recurrenceType: 'none' | 'daily' | 'weekly';
    weeklyDays: number[];
    dueDate: string;
  }) {
    if (!userId || !fields.title.trim()) return;

    const recurrenceRule: RecurrenceRule | null =
      fields.recurrenceType === 'daily'
        ? { freq: 'daily' }
        : fields.recurrenceType === 'weekly' && fields.weeklyDays.length > 0
          ? { freq: 'weekly', days: fields.weeklyDays }
          : null;

    const payload = {
      title: fields.title.trim(),
      category: fields.category.trim() || null,
      priority: fields.priority,
      time_of_day: fields.timeOfDay,
      due_date: recurrenceRule ? null : fields.dueDate || null,
      recurrence_rule: recurrenceRule,
    };

    if (editing) {
      await supabase.from('tasks').update(payload).eq('id', editing.id);
    } else {
      const { data: task } = await supabase.from('tasks').insert({ ...payload, user_id: userId }).select('id').single();
      if (task) {
        const genDate = recurrenceRule ? today : payload.due_date;
        if (genDate) await generateInstancesForDate(supabase, userId, genDate);
      }
    }

    setFormOpen(false);
    setEditing(null);
    await load();
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={['top']}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>ALL TASKS</Text>
          <Text style={styles.title}>Tasks</Text>
        </View>
        <Pressable
          style={styles.newButton}
          onPress={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Text style={styles.newButtonText}>+ New task</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {tasks.length === 0 && <Text style={styles.emptyText}>No tasks yet — add one above.</Text>}
        {tasks.map((task) => {
          const recurrence = recurrenceLabel(task.recurrenceRule);
          return (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskCardTop}>
                <View style={[styles.dot, { backgroundColor: priorityDot[task.priority] }]} />
                <Text style={styles.taskTitle}>{task.title}</Text>
                {recurrence && (
                  <View style={styles.recurrenceChip}>
                    <Text style={styles.recurrenceChipText}>{recurrence}</Text>
                  </View>
                )}
              </View>
              <View style={styles.taskCardMeta}>
                {task.category && <Text style={styles.metaText}>{task.category}</Text>}
                <Text style={styles.metaText}>{TIME_OF_DAY_LABEL[task.timeOfDay]}</Text>
                {task.dueDate && !task.recurrenceRule && <Text style={styles.metaText}>due {task.dueDate}</Text>}
              </View>
              <View style={styles.taskCardActions}>
                <Pressable
                  onPress={() => {
                    setEditing(task);
                    setFormOpen(true);
                  }}
                >
                  <Text style={styles.actionLink}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => handleDelete(task)}>
                  <Text style={styles.actionLinkDanger}>Delete</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <TaskFormModal
        visible={formOpen}
        task={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSave}
      />
    </SafeAreaView>
  );
}

function TaskFormModal({
  visible,
  task,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  task: TaskItem | null;
  onClose: () => void;
  onSubmit: (fields: {
    title: string;
    category: string;
    priority: Priority;
    timeOfDay: TimeOfDay;
    recurrenceType: 'none' | 'daily' | 'weekly';
    weeklyDays: number[];
    dueDate: string;
  }) => void;
}) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState<Priority>('med');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly'>('none');
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setCategory(task.category ?? '');
      setPriority(task.priority);
      setTimeOfDay(task.timeOfDay);
      setRecurrenceType(task.recurrenceRule ? task.recurrenceRule.freq : 'none');
      setWeeklyDays(task.recurrenceRule?.freq === 'weekly' ? task.recurrenceRule.days : []);
      setDueDate(task.dueDate ?? '');
    } else {
      setTitle('');
      setCategory('');
      setPriority('med');
      setTimeOfDay('morning');
      setRecurrenceType('none');
      setWeeklyDays([]);
      setDueDate(todayString());
    }
  }, [task, visible]);

  function toggleWeekday(idx: number) {
    setWeeklyDays((prev) => (prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <ScrollView style={styles.modalCard} contentContainerStyle={{ paddingBottom: 20 }}>
          <Text style={styles.modalTitle}>{task ? 'Edit task' : 'New task'}</Text>

          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Task title" placeholderTextColor={colors.inkFaint} />
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            value={category}
            onChangeText={setCategory}
            placeholder="Category (optional)"
            placeholderTextColor={colors.inkFaint}
          />

          <Text style={styles.modalLabel}>Priority</Text>
          <View style={styles.segmented}>
            {(['low', 'med', 'high'] as Priority[]).map((p) => (
              <Pressable key={p} style={[styles.segmentOption, priority === p && styles.segmentOptionActive]} onPress={() => setPriority(p)}>
                <Text style={[styles.segmentText, priority === p && styles.segmentTextActive]}>{p}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>When</Text>
          <View style={styles.segmented}>
            {TIME_OF_DAY_ORDER.map((tod) => (
              <Pressable key={tod} style={[styles.segmentOption, timeOfDay === tod && styles.segmentOptionActive]} onPress={() => setTimeOfDay(tod)}>
                <Text style={[styles.segmentText, timeOfDay === tod && styles.segmentTextActive]}>{TIME_OF_DAY_LABEL[tod]}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.modalLabel}>Recurrence</Text>
          <View style={styles.segmented}>
            {(['none', 'daily', 'weekly'] as const).map((r) => (
              <Pressable key={r} style={[styles.segmentOption, recurrenceType === r && styles.segmentOptionActive]} onPress={() => setRecurrenceType(r)}>
                <Text style={[styles.segmentText, recurrenceType === r && styles.segmentTextActive]}>
                  {r === 'none' ? 'One-off' : r}
                </Text>
              </Pressable>
            ))}
          </View>

          {recurrenceType === 'none' && (
            <>
              <Text style={styles.modalLabel}>Due date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder={todayString()}
                placeholderTextColor={colors.inkFaint}
              />
            </>
          )}

          {recurrenceType === 'weekly' && (
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((label, idx) => (
                <Pressable
                  key={label}
                  style={[styles.weekdayChip, weeklyDays.includes(idx) && styles.weekdayChipActive]}
                  onPress={() => toggleWeekday(idx)}
                >
                  <Text style={[styles.weekdayChipText, weeklyDays.includes(idx) && styles.segmentTextActive]}>{label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={styles.modalActions}>
            <Pressable
              style={styles.modalPrimary}
              onPress={() => onSubmit({ title, category, priority, timeOfDay, recurrenceType, weeklyDays, dueDate })}
            >
              <Text style={styles.modalPrimaryText}>{task ? 'Save changes' : 'Create task'}</Text>
            </Pressable>
            <Pressable style={styles.modalSecondary} onPress={onClose}>
              <Text style={styles.modalSecondaryText}>Cancel</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 18, paddingBottom: 10 },
  eyebrow: { color: colors.inkFaint, fontSize: 11, letterSpacing: 1 },
  title: { color: colors.ink, fontSize: 22, fontWeight: '700', marginTop: 4 },
  newButton: { backgroundColor: colors.accent, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 },
  newButtonText: { color: colors.accentInk, fontWeight: '700', fontSize: 12 },
  scrollContent: { padding: 18, paddingTop: 4, paddingBottom: 40, gap: 10 },
  emptyText: { color: colors.inkFaint, fontSize: 13 },
  taskCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 12 },
  taskCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  taskTitle: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: '600' },
  recurrenceChip: { borderColor: 'rgba(79,191,159,0.4)', borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  recurrenceChipText: { color: colors.accent, fontSize: 10 },
  taskCardMeta: { flexDirection: 'row', gap: 10, marginTop: 8, marginLeft: 14 },
  metaText: { color: colors.inkMuted, fontSize: 11 },
  taskCardActions: { flexDirection: 'row', gap: 16, marginTop: 10, marginLeft: 14 },
  actionLink: { color: colors.inkFaint, fontSize: 12 },
  actionLinkDanger: { color: colors.red, fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, maxHeight: '85%' },
  modalTitle: { color: colors.ink, fontSize: 17, fontWeight: '700', marginBottom: 14 },
  modalLabel: { color: colors.inkMuted, fontSize: 11, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: colors.surfaceRaised, borderColor: colors.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontSize: 14 },
  segmented: { flexDirection: 'row', gap: 8 },
  segmentOption: { flex: 1, borderColor: colors.border, borderWidth: 1, borderRadius: 6, paddingVertical: 8, alignItems: 'center' },
  segmentOptionActive: { backgroundColor: 'rgba(79,191,159,0.12)', borderColor: 'rgba(79,191,159,0.4)' },
  segmentText: { color: colors.inkMuted, fontSize: 12, textTransform: 'capitalize' },
  segmentTextActive: { color: colors.accent, fontWeight: '700' },
  weekdayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  weekdayChip: { borderColor: colors.border, borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  weekdayChipActive: { backgroundColor: 'rgba(79,191,159,0.12)', borderColor: 'rgba(79,191,159,0.4)' },
  weekdayChipText: { color: colors.inkMuted, fontSize: 11 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 22, alignItems: 'center' },
  modalPrimary: { backgroundColor: colors.accent, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 8 },
  modalPrimaryText: { color: colors.accentInk, fontWeight: '700', fontSize: 13 },
  modalSecondary: { paddingHorizontal: 8, paddingVertical: 11 },
  modalSecondaryText: { color: colors.inkFaint, fontSize: 13 },
});
