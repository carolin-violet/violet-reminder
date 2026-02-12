import AsyncStorage from '@react-native-async-storage/async-storage';

const TODOS_KEY = '@violet/todos';

export interface TodoItem {
  id: string;
  title: string;
  dueDate: string | null;
  createdAt: number;
}

/** 从本地读取待办列表 */
export async function loadTodos(): Promise<TodoItem[]> {
  try {
    const raw = await AsyncStorage.getItem(TODOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TodoItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** 将待办列表写入本地 */
export async function saveTodos(items: TodoItem[]): Promise<void> {
  await AsyncStorage.setItem(TODOS_KEY, JSON.stringify(items));
}

/** 按截止日期升序、无日期的排最后 */
export function sortTodos(items: TodoItem[]): TodoItem[] {
  return [...items].sort((a, b) => {
    const aHas = a.dueDate != null;
    const bHas = b.dueDate != null;
    if (aHas && !bHas) return -1;
    if (!aHas && bHas) return 1;
    if (!aHas && !bHas) return a.createdAt - b.createdAt;
    return (a.dueDate as string).localeCompare(b.dueDate as string);
  });
}
