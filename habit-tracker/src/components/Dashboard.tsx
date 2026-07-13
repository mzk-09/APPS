
import { useStore } from '../store';
import type { Habit } from '../store';
import { Button, Input, GlowWrap } from './ui';
import { Check, Flame, AlertCircle } from 'lucide-react';

export function Dashboard() {
  const { habits, categories, logs, selectedDate, addLog, removeLog } = useStore();

  const habitsByCategory = categories.map(category => ({
    ...category,
    habits: habits.filter(h => h.categoryId === category.id)
  })).filter(c => c.habits.length > 0);

  const getLogForSelectedDate = (habitId: string) => {
    return logs.find(l => l.habitId === habitId && l.date === selectedDate);
  };

  const handleToggleBoolean = (habit: Habit) => {
    const log = getLogForSelectedDate(habit.id);
    if (log && log.value === 1) {
      removeLog(habit.id, selectedDate);
    } else {
      addLog(habit.id, selectedDate, 1);
    }
  };

  const handleNumericChange = (habit: Habit, value: string) => {
    if (value === '') {
      removeLog(habit.id, selectedDate);
    } else {
      addLog(habit.id, selectedDate, Number(value));
    }
  };

  if (habits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
          <Flame className="w-8 h-8 text-zinc-700" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No Habits Yet</h2>
        <p className="text-zinc-500 max-w-xs mx-auto">
          Create your first habit to start tracking your daily progress.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto pb-32 pt-4 px-4 space-y-8">
      {habitsByCategory.map(category => (
        <div key={category.id} className="space-y-4">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest pl-1">
            {category.name}
          </h3>
          <div className="space-y-3">
            {category.habits.map(habit => {
              const log = getLogForSelectedDate(habit.id);
              const isCompleted = habit.trackingType === 'boolean'
                ? log?.value === 1
                : (habit.target ? (log?.value || 0) >= habit.target : (log?.value || 0) > 0);

              return (
                <div
                  key={habit.id}
                  className={`bg-zinc-900 border rounded-2xl p-4 transition-all duration-300 ${isCompleted ? 'border-zinc-700 bg-zinc-800/50' : 'border-zinc-800'}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: habit.color, boxShadow: isCompleted ? `0 0 10px ${habit.color}` : 'none' }}
                      />
                      <span className={`font-medium text-lg ${isCompleted ? 'text-white' : 'text-zinc-300'}`}>
                        {habit.name}
                      </span>
                    </div>
                    {habit.strictMode && (
                      <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-md">
                        <AlertCircle className="w-3 h-3" />
                        Strict
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    {habit.trackingType === 'boolean' ? (
                      <GlowWrap active={isCompleted} color={habit.color}>
                        <Button
                          variant="ghost"
                          className={`w-full h-14 rounded-xl border-2 transition-all ${
                            isCompleted
                              ? 'border-transparent text-black'
                              : 'border-zinc-700 text-zinc-500 hover:border-zinc-600'
                          }`}
                          style={isCompleted ? { backgroundColor: habit.color } : {}}
                          onClick={() => handleToggleBoolean(habit)}
                        >
                          {isCompleted ? <Check className="w-6 h-6" /> : 'Mark Done'}
                        </Button>
                      </GlowWrap>
                    ) : (
                      <div className="flex items-center gap-3 w-full">
                        <Input
                          type="number"
                          placeholder={habit.target ? `Target: ${habit.target}` : 'Enter value'}
                          value={log?.value || ''}
                          onChange={(e) => handleNumericChange(habit, e.target.value)}
                          className={`h-14 text-lg bg-zinc-950 border-2 ${isCompleted ? 'border-green-500/50 focus:border-green-500' : 'border-zinc-800'}`}
                        />
                        {isCompleted && (
                          <div className="w-14 h-14 flex-shrink-0 bg-green-500/20 text-green-500 rounded-xl flex items-center justify-center">
                            <Check className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
