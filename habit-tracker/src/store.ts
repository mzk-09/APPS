import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';

export type TrackingType = 'boolean' | 'numeric';
export type AnalyticsConfig = 'line' | 'bar' | 'heatmap' | 'none';

export interface Habit {
  id: string;
  name: string;
  categoryId: string;
  color: string;
  trackingType: TrackingType;
  target?: number; // Optional goal value
  strictMode: boolean;
  analyticsConfig: AnalyticsConfig;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Log {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD
  value: number; // 1 or 0 for boolean, actual number for numeric
}

interface AppState {
  habits: Habit[];
  categories: Category[];
  logs: Log[];
  selectedDate: string; // YYYY-MM-DD

  // Actions
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;

  addCategory: (name: string, id?: string) => void;
  deleteCategory: (id: string) => void;

  addLog: (habitId: string, date: string, value: number) => void;
  removeLog: (habitId: string, date: string) => void;

  setSelectedDate: (date: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      habits: [],
      categories: [
        { id: 'cat-health', name: 'Health' },
        { id: 'cat-work', name: 'Work' },
        { id: 'cat-personal', name: 'Personal' }
      ],
      logs: [],
      selectedDate: format(new Date(), 'yyyy-MM-dd'),

      addHabit: (habitData) => set((state) => ({
        habits: [
          ...state.habits,
          {
            ...habitData,
            id: `habit-${generateId()}`,
            createdAt: new Date().toISOString()
          }
        ]
      })),

      updateHabit: (id, updates) => set((state) => ({
        habits: state.habits.map(h => h.id === id ? { ...h, ...updates } : h)
      })),

      deleteHabit: (id) => set((state) => ({
        habits: state.habits.filter(h => h.id !== id),
        logs: state.logs.filter(l => l.habitId !== id) // Cascade delete
      })),

      addCategory: (name, id) => set((state) => ({
        categories: [...state.categories, { id: id || `cat-${generateId()}`, name }]
      })),

      deleteCategory: (id) => set((state) => ({
        categories: state.categories.filter(c => c.id !== id)
      })),

      addLog: (habitId, date, value) => set((state) => {
        // Remove existing log for this habit and date if it exists
        const filteredLogs = state.logs.filter(
          l => !(l.habitId === habitId && l.date === date)
        );
        return {
          logs: [
            ...filteredLogs,
            { id: `log-${generateId()}`, habitId, date, value }
          ]
        };
      }),

      removeLog: (habitId, date) => set((state) => ({
        logs: state.logs.filter(l => !(l.habitId === habitId && l.date === date))
      })),

      setSelectedDate: (date) => set({ selectedDate: date })
    }),
    {
      name: 'habit-tracker-storage',
    }
  )
);
