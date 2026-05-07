import { useMemo } from 'react';
import { useStore } from '../store';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { X, Trophy, Flame, AlertCircle } from 'lucide-react';
import { Button } from './ui';

interface AnalyticsProps {
  onClose: () => void;
}

export function Analytics({ onClose }: AnalyticsProps) {
  const { habits, logs } = useStore();

  const metrics = useMemo(() => {
    const today = new Date();
    const last30Days = eachDayOfInterval({ start: subDays(today, 29), end: today });

    let bestHabitId = '';
    let bestStreak = 0;
    let weakestHabitId = '';
    let weakestConsistency = 100;

    const habitStats = habits.map(habit => {
      const habitLogs = logs.filter(l => l.habitId === habit.id);

      // Calculate Streaks
      let currentStreak = 0;
      let isStreakBroken = false;

      // Calculate Consistency
      let completedDays = 0;

      // Numeric specifics
      let sum = 0;
      let max = 0;
      let min = Infinity;

      // Generate chart data for last 30 days
      const chartData = [...last30Days].reverse().map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const log = habitLogs.find(l => l.date === dateStr);

        let value = 0;
        let isSuccess = false;

        if (log) {
          value = log.value;
          isSuccess = habit.trackingType === 'boolean'
            ? value === 1
            : (habit.target ? value >= habit.target : value > 0);
        }

        if (isSuccess) {
          completedDays++;
          if (!isStreakBroken) currentStreak++;
        } else if (dateStr !== format(today, 'yyyy-MM-dd') || log) {
          // If we missed a past day, or explicitly logged 0 today
          if (habit.strictMode) {
            isStreakBroken = true;
          } else {
            // Flexible mode - pause streak or soft decay (for now, just don't reset completely, just pause)
            // Complex decay can be added, for now, strict=reset, flex=pause
          }
        }

        if (habit.trackingType === 'numeric' && log) {
          sum += value;
          if (value > max) max = value;
          if (value < min) min = value;
        }

        return {
          date: format(day, 'MMM dd'),
          value: value,
          success: isSuccess ? 1 : 0
        };
      }); // Already reversed so today is first in calculation, but we want chart left-to-right

      chartData.reverse();

      const consistency = (completedDays / 30) * 100;

      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
        bestHabitId = habit.id;
      }

      if (consistency < weakestConsistency) {
        weakestConsistency = consistency;
        weakestHabitId = habit.id;
      }

      return {
        habit,
        currentStreak,
        consistency,
        completedDays,
        chartData,
        avg: sum / (habitLogs.length || 1),
        max,
        min: min === Infinity ? 0 : min
      };
    });

    return {
      habitStats,
      bestHabit: habits.find(h => h.id === bestHabitId),
      weakestHabit: habits.find(h => h.id === weakestHabitId),
      bestStreak
    };
  }, [habits, logs]);

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur-md border-b border-zinc-800 px-4 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-6 h-6" />
        </Button>
      </div>

      <div className="p-4 space-y-8 max-w-3xl mx-auto pb-24">

        {/* Global Insights */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Global Insights</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-yellow-500 mb-2">
                <Trophy className="w-5 h-5" />
                <span className="font-medium text-sm">Best Habit</span>
              </div>
              <p className="text-white font-bold truncate">
                {metrics.bestHabit ? metrics.bestHabit.name : 'N/A'}
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-orange-500 mb-2">
                <Flame className="w-5 h-5" />
                <span className="font-medium text-sm">Top Streak</span>
              </div>
              <p className="text-white font-bold">
                {metrics.bestStreak} <span className="text-sm text-zinc-500 font-normal">days</span>
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-red-500 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium text-sm">Needs Work</span>
              </div>
              <p className="text-white font-bold truncate">
                {metrics.weakestHabit ? metrics.weakestHabit.name : 'N/A'}
              </p>
            </div>
          </div>
        </section>

        {/* Habit Metrics */}
        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Habit Breakdown</h2>
          <div className="space-y-6">
            {metrics.habitStats.map(stat => (
              <div key={stat.habit.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.habit.color }}></span>
                      {stat.habit.name}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      {stat.habit.strictMode ? 'Strict Mode Active' : 'Flexible Mode'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{Math.round(stat.consistency)}%</p>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Consistency</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-6">
                  <div className="bg-black/50 rounded-xl p-3 text-center">
                    <p className="text-white font-bold text-lg">{stat.currentStreak}</p>
                    <p className="text-[10px] text-zinc-500 uppercase">Streak</p>
                  </div>
                  <div className="bg-black/50 rounded-xl p-3 text-center">
                    <p className="text-white font-bold text-lg">{stat.completedDays}</p>
                    <p className="text-[10px] text-zinc-500 uppercase">30d Total</p>
                  </div>
                  {stat.habit.trackingType === 'numeric' && (
                    <div className="bg-black/50 rounded-xl p-3 text-center">
                      <p className="text-white font-bold text-lg">{Math.round(stat.avg)}</p>
                      <p className="text-[10px] text-zinc-500 uppercase">Average</p>
                    </div>
                  )}
                </div>

                {/* Charts */}
                {stat.habit.analyticsConfig !== 'none' && (
                  <div className="h-40 mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      {stat.habit.analyticsConfig === 'line' ? (
                        <LineChart data={stat.chartData}>
                          <XAxis dataKey="date" hide />
                          <YAxis hide domain={stat.habit.trackingType === 'boolean' ? [0, 1] : ['auto', 'auto']} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#000', border: '1px solid #27272a', borderRadius: '8px' }}
                            itemStyle={{ color: stat.habit.color }}
                            labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={stat.habit.color}
                            strokeWidth={3}
                            dot={false}
                            activeDot={{ r: 6, fill: stat.habit.color, stroke: '#000', strokeWidth: 2 }}
                          />
                        </LineChart>
                      ) : (
                        <BarChart data={stat.chartData}>
                          <XAxis dataKey="date" hide />
                          <YAxis hide />
                          <Tooltip
                            cursor={{ fill: '#27272a', opacity: 0.4 }}
                            contentStyle={{ backgroundColor: '#000', border: '1px solid #27272a', borderRadius: '8px' }}
                          />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {stat.chartData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  stat.habit.trackingType === 'boolean'
                                    ? (entry.value ? stat.habit.color : '#27272a')
                                    : stat.habit.color
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                )}

                {stat.habit.analyticsConfig === 'heatmap' && (
                  <div className="mt-4 flex flex-wrap gap-1">
                    {stat.chartData.map((d, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-sm"
                        style={{
                          backgroundColor: d.value ? stat.habit.color : '#27272a',
                          opacity: d.value ? (stat.habit.trackingType === 'numeric' && stat.max > 0 ? (d.value / stat.max) : 1) : 0.3
                        }}
                        title={`${d.date}: ${d.value}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {metrics.habitStats.length === 0 && (
              <div className="text-center py-12 text-zinc-500">
                <p>No habits to analyze yet.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
