import DateTimePicker, {
  DateTimePickerAndroid,
} from '@react-native-community/datetimepicker';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import {
  loadTodos,
  saveTodos,
  sortTodos,
  type TodoItem,
} from '@/utils/todo-storage';

const ACCENT = { light: '#7C3AED', dark: '#A78BFA' };
const ACCENT_BG = {
  light: 'rgba(124, 58, 237, 0.12)',
  dark: 'rgba(167, 139, 250, 0.15)',
};
const CARD_BG = { light: 'rgba(128,128,128,0.06)', dark: 'rgba(255,255,255,0.05)' };
const BORDER = { light: 'rgba(0,0,0,0.08)', dark: 'rgba(255,255,255,0.08)' };

/** 日期显示为 YYYY-MM-DD 格式 */
function formatDueDate(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 根据截止日期得到状态：已逾期 / 3 天内 / 正常 */
function getDueStatus(dueDate: string | null): 'overdue' | 'warning' | 'normal' {
  if (dueDate == null) return 'normal';
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'warning';
  return 'normal';
}

const DUE_STATUS_COLOR = {
  overdue: '#C94A4A',
  warning: '#C9A227',
  normal: undefined,
} as const;

export default function TodoScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [input, setInput] = useState('');
  const [tempDueDate, setTempDueDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  /** 正在修改截止日期的待办 id（iOS 用），与 tempDueDate 共用同一套 picker */
  const [editingDueItemId, setEditingDueItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reduceMotion = useReducedMotion();
  const accent = ACCENT[colorScheme];
  const accentBg = ACCENT_BG[colorScheme];
  const cardBg = CARD_BG[colorScheme];
  const border = BORDER[colorScheme];
  const textColor = Colors[colorScheme].text;

  const persist = useCallback(async (next: TodoItem[]) => {
    setTodos(next);
    await saveTodos(next);
  }, []);

  /** 打开日期选择：不传参为添加时的选择，传 item 为编辑该条截止日期 */
  const openAndroidPicker = useCallback(
    (forEditItem?: TodoItem) => {
      if (Platform.OS !== 'android') return;
      const initial = forEditItem
        ? forEditItem.dueDate
          ? new Date(forEditItem.dueDate)
          : new Date()
        : tempDueDate ?? new Date();
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        onChange: (_, selectedDate) => {
          if (selectedDate == null) return;
          if (forEditItem) {
            const next = todos.map((t) =>
              t.id === forEditItem.id
                ? { ...t, dueDate: selectedDate.toISOString() }
                : t
            );
            persist(next);
          } else {
            setTempDueDate(selectedDate);
          }
        },
      });
    },
    [tempDueDate, todos, persist]
  );

  /** iOS 点「确定」：若在编辑则更新该条截止日期并关闭，否则仅关闭 picker */
  const handlePickerConfirm = useCallback(() => {
    if (editingDueItemId != null && tempDueDate != null) {
      const next = todos.map((t) =>
        t.id === editingDueItemId
          ? { ...t, dueDate: tempDueDate.toISOString() }
          : t
      );
      persist(next);
      setEditingDueItemId(null);
      setTempDueDate(null);
    } else {
      setShowPicker(false);
    }
  }, [editingDueItemId, tempDueDate, todos, persist]);

  useEffect(() => {
    (async () => {
      const data = await loadTodos();
      setTodos(sortTodos(data));
      setLoading(false);
    })();
  }, []);

  const sortedTodos = sortTodos(todos);

  const handleAdd = useCallback(() => {
    const title = input.trim();
    if (!title) return;
    Keyboard.dismiss();
    const next: TodoItem[] = [
      ...todos,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title,
        dueDate: tempDueDate ? tempDueDate.toISOString() : null,
        createdAt: Date.now(),
      },
    ];
    setInput('');
    setTempDueDate(null);
    persist(next);
  }, [input, todos, tempDueDate, persist]);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert('删除', '确定删除这条待办？', [
        { text: '取消', style: 'cancel' },
        { text: '删除', style: 'destructive', onPress: () => persist(todos.filter((t) => t.id !== id)) },
      ]);
    },
    [todos, persist]
  );

  const onPickerChange = useCallback((_: unknown, date?: Date) => {
    if (date != null) setTempDueDate(date);
    if (Platform.OS === 'ios') return;
    setShowPicker(false);
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: accentBg }]}>
            <IconSymbol name="list.bullet" size={48} color={accent} />
          </View>
          <ThemedText type="title" style={styles.title}>
            待办事项
          </ThemedText>
          <ThemedText style={styles.subtitle}>按截止日期排序，无日期的在最后</ThemedText>
        </View>

        <View style={[styles.addCard, { backgroundColor: cardBg, borderColor: border }]}>
          <TextInput
            style={[styles.input, { borderColor: border, color: textColor }]}
            placeholder="添加待办..."
            placeholderTextColor={colorScheme === 'dark' ? '#8A8A8A' : '#6B6B6B'}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <View style={styles.addRow}>
            <Pressable
              accessibilityLabel={
                tempDueDate
                  ? `截止日期 ${formatDueDate(tempDueDate.toISOString())}，点击可修改`
                  : '选截止日期'
              }
              accessibilityRole="button"
              onPress={() => {
                if (Platform.OS === 'android') {
                  openAndroidPicker();
                } else {
                  setShowPicker(true);
                }
              }}
              style={[styles.dateBtn, { borderColor: border }]}>
              <IconSymbol name="calendar" size={18} color={accent} style={styles.dateBtnIcon} />
              <ThemedText style={[styles.dateBtnText, { color: accent }]}>
                {tempDueDate ? formatDueDate(tempDueDate.toISOString()) : '选截止日期'}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityLabel="添加待办"
              accessibilityRole="button"
              accessibilityState={{ disabled: !input.trim() }}
              onPress={handleAdd}
              style={[styles.addBtn, { backgroundColor: accent }]}
              disabled={!input.trim()}>
              <IconSymbol name="plus.circle.fill" size={22} color="#fff" style={styles.addBtnIcon} />
              <ThemedText style={styles.addBtnText}>添加</ThemedText>
            </Pressable>
          </View>
          {Platform.OS === 'ios' && showPicker && editingDueItemId == null && (
            <>
              <DateTimePicker
                value={tempDueDate ?? new Date()}
                mode="date"
                display="spinner"
                onChange={onPickerChange}
              />
              <Pressable
                style={styles.pickerDone}
                onPress={handlePickerConfirm}>
                <ThemedText style={[styles.pickerDoneText, { color: accent }]}>确定</ThemedText>
              </Pressable>
            </>
          )}
        </View>

        {loading ? (
          <ThemedText style={styles.hint}>加载中…</ThemedText>
        ) : sortedTodos.length === 0 ? (
          <ThemedText style={styles.hint}>暂无待办，上方添加一条</ThemedText>
        ) : (
          <View style={styles.list}>
            {sortedTodos.map((item, index) => {
              const status = getDueStatus(item.dueDate);
              const statusColor = DUE_STATUS_COLOR[status];
              const isEditingDue = editingDueItemId === item.id;
              return (
                <Animated.View
                  key={item.id}
                  entering={reduceMotion ? undefined : FadeIn.delay(index * 40).duration(220)}
                  style={styles.listItem}>
                  <View
                    style={[
                      styles.row,
                      {
                        backgroundColor: cardBg,
                        borderColor: border,
                        borderLeftWidth: statusColor != null ? 4 : 1,
                        borderLeftColor: statusColor ?? border,
                      },
                    ]}>
                    <View style={styles.rowBody}>
                      <ThemedText
                        style={[
                          styles.rowTitle,
                          status === 'overdue' && styles.rowTitleOverdue,
                        ]}
                        numberOfLines={2}>
                        {item.title}
                      </ThemedText>
                      <Pressable
                        accessibilityLabel={
                          item.dueDate != null
                            ? `截止日期 ${formatDueDate(item.dueDate)}，点击可修改`
                            : '设截止日期'
                        }
                        accessibilityRole="button"
                        onPress={() => {
                          if (Platform.OS === 'android') {
                            openAndroidPicker(item);
                          } else {
                            setEditingDueItemId(item.id);
                            setTempDueDate(item.dueDate ? new Date(item.dueDate) : new Date());
                          }
                        }}
                        style={styles.rowDueWrap}>
                        <IconSymbol
                          name="calendar"
                          size={14}
                          color={statusColor ?? accent}
                          style={styles.rowDueIcon}
                        />
                        <ThemedText style={[styles.rowDue, { color: statusColor ?? accent }]}>
                          {item.dueDate != null ? formatDueDate(item.dueDate) : '设截止日期'}
                        </ThemedText>
                      </Pressable>
                    </View>
                    <Pressable
                      accessibilityLabel="删除"
                      accessibilityRole="button"
                      onPress={() => handleDelete(item.id)}
                      style={({ pressed }) => [styles.delBtn, pressed && styles.delBtnPressed]}
                      hitSlop={12}>
                      <IconSymbol name="trash.fill" size={20} color="#C94A4A" />
                    </Pressable>
                  </View>
                  {Platform.OS === 'ios' && isEditingDue && (
                    <View
                      style={[
                        styles.rowPickerWrap,
                        { backgroundColor: cardBg, borderColor: border },
                      ]}>
                      <DateTimePicker
                        value={tempDueDate ?? new Date()}
                        mode="date"
                        display="spinner"
                        onChange={onPickerChange}
                      />
                      <Pressable style={styles.pickerDone} onPress={handlePickerConfirm}>
                        <ThemedText style={[styles.pickerDoneText, { color: accent }]}>
                          确定
                        </ThemedText>
                      </Pressable>
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 28,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: { fontSize: 14, opacity: 0.7 },
  addCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  dateBtnIcon: { marginRight: 6 },
  dateBtnText: { fontSize: 14 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  addBtnIcon: { marginRight: 6 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  list: { gap: 10 },
  listItem: { gap: 0 },
  rowPickerWrap: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingBottom: 8,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  rowBody: { flex: 1, marginRight: 12 },
  rowTitle: { fontSize: 16, marginBottom: 2 },
  rowTitleOverdue: { color: DUE_STATUS_COLOR.overdue },
  rowDueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  rowDueIcon: { marginRight: 4 },
  rowDue: { fontSize: 13 },
  delBtn: {
    minWidth: 44,
    minHeight: 44,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delBtnPressed: { opacity: 0.7 },
  hint: { textAlign: 'center', opacity: 0.7, marginTop: 24 },
  pickerDone: { marginTop: 8, paddingVertical: 10, alignItems: 'center' },
  pickerDoneText: { fontSize: 16, fontWeight: '600' },
});