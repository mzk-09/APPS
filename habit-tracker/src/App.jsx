import { useState, useEffect, useCallback } from 'react';
import {
  Plus, ChevronLeft, ChevronRight, Flame, Zap, Check, BarChart2, Activity,
  Grid, ArrowLeft, TrendingUp, Calendar, Hash, ToggleLeft, ToggleRight,
  Target, Layers, X,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS = {
  blue:   { glow: 'shadow-blue-500/40',   ring: 'ring-blue-500',   bg: 'bg-blue-500',   text: 'text-blue-400',   hex: '#3b82f6', light: '#93c5fd' },
  green:  { glow: 'shadow-green-500/40',  ring: 'ring-green-500',  bg: 'bg-green-500',  text: 'text-green-400',  hex: '#22c55e', light: '#86efac' },
  purple: { glow: 'shadow-purple-500/40', ring: 'ring-purple-500', bg: 'bg-purple-500', text: 'text-purple-400', hex: '#a855f7', light: '#d8b4fe' },
  rose:   { glow: 'shadow-rose-500/40',   ring: 'ring-rose-500',   bg: 'bg-rose-500',   text: 'text-rose-400',   hex: '#f43f5e', light: '#fda4af' },
  amber:  { glow: 'shadow-amber-500/40',  ring: 'ring-amber-500',  bg: 'bg-amber-500',  text: 'text-amber-400',  hex: '#f59e0b', light: '#fcd34d' },
  cyan:   { glow: 'shadow-cyan-500/40',   ring: 'ring-cyan-500',   bg: 'bg-cyan-500',   text: 'text-cyan-400',   hex: '#06b6d4', light: '#67e8f9' },
};

const CHART_TYPES = ['Bar', 'Line', 'Heatmap'];

const TODAY = () => new Date().toISOString().slice(0, 10);

// ─── Utilities ────────────────────────────────────────────────────────────────

function dateStr(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return dateStr(d);
}

function last14Days(endDate) {
  const days = [];
  for (let i = 13; i >= 0; i--) days.push(addDays(endDate, -i));
  return days;
}

function formatDate(ds) {
  const d = new Date(ds + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatShort(ds) {
  const d = new Date(ds + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isCompleted(habit, entry) {
  if (!entry) return false;
  if (entry.skipped) return false;
  if (habit.type === 'boolean') return entry.done === true;
  if (habit.type === 'numeric') {
    if (habit.target) return Number(entry.value) >= Number(habit.target);
    return entry.value !== undefined && entry.value !== '' && Number(entry.value) > 0;
  }
  return false;
}

function isFailed(habit, entry, date) {
  if (!entry) {
    // In strict mode, missing any past day counts as failed
    if (habit.strict && date < TODAY()) return true;
    return false;
  }
  if (entry.skipped) return true;
  return false;
}

function computeStreak(habit, logs) {
  const today = TODAY();
  let streak = 0;
  let d = today;

  while (true) {
    const entry = logs[d];
    const completed = isCompleted(habit, entry);
    const failed = isFailed(habit, entry, d);

    if (completed) {
      streak++;
      d = addDays(d, -1);
    } else if (failed) {
      break;
    } else {
      // Not completed, not failed
      if (habit.strict) {
        // In strict mode: if it's a past day with no entry, streak breaks
        if (d < today) break;
        else d = addDays(d, -1); // today has no entry yet, look back
      } else {
        // Flexible: empty days pause but don't break
        if (d === today) {
          d = addDays(d, -1);
          continue;
        }
        d = addDays(d, -1);
        if (d < addDays(today, -365)) break; // safety limit
        // If we go too far back with no data, stop
        const nextEntry = logs[d];
        if (!nextEntry && d < addDays(today, -60)) break;
      }
    }
    if (d < addDays(today, -365)) break;
  }
  return streak;
}

function computeBestStreak(habit, logs) {
  const today = TODAY();
  let best = 0;
  let current = 0;
  const allDates = Object.keys(logs).sort();
  if (allDates.length === 0) return 0;

  const start = allDates[0];
  let d = start;

  while (d <= today) {
    const entry = logs[d];
    if (isCompleted(habit, entry)) {
      current++;
      if (current > best) best = current;
    } else if (isFailed(habit, entry, d)) {
      current = 0;
    } else {
      // Flexible mode: pause; strict mode: reset
      if (habit.strict && d < today) current = 0;
    }
    d = addDays(d, 1);
  }
  return best;
}

function streakBrokenToday(habit, logs) {
  if (!habit.strict) return false;
  const today = TODAY();
  const entry = logs[today];
  if (!entry) return false;
  if (entry.skipped) return true;
  if (habit.type === 'boolean' && entry.done === false) return true;
  if (habit.type === 'numeric' && habit.target) {
    if (entry.value !== undefined && Number(entry.value) < Number(habit.target)) return true;
  }
  return false;
}

// ─── Local Storage ────────────────────────────────────────────────────────────

const LS_KEY = 'habitron_v1';

function loadData() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { habits: [], logs: {} };
}

function saveData(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function glowStyle(colorName, intensity = 0.5) {
  const hex = COLORS[colorName]?.hex ?? '#3b82f6';
  return { boxShadow: `0 0 18px ${hex}${Math.round(intensity * 255).toString(16).padStart(2, '0')}` };
}

function colorDot(colorName) {
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${COLORS[colorName]?.bg ?? 'bg-zinc-500'}`} />;
}

// ─── Custom Charts ────────────────────────────────────────────────────────────

function BarChart({ data, target, color, days }) {
  const [tooltip, setTooltip] = useState(null);
  const maxVal = Math.max(...data.map(d => d.value ?? 0), target ?? 0, 1);

  return (
    <div className="relative w-full" style={{ height: 140 }}>
      {/* Target line */}
      {target > 0 && (
        <div
          className="absolute left-0 right-0 border-t border-dashed border-zinc-400 pointer-events-none"
          style={{ bottom: `${(target / maxVal) * 100}%`, zIndex: 2 }}
        >
          <span className="absolute right-0 -top-4 text-xs text-zinc-400">Target</span>
        </div>
      )}
      <div className="flex items-end gap-0.5 h-full pt-4">
        {data.map((d, i) => {
          const h = d.value != null ? Math.max(4, (d.value / maxVal) * 100) : 0;
          const isToday = d.date === TODAY();
          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center justify-end cursor-pointer group relative"
              style={{ height: '100%' }}
              onMouseEnter={() => setTooltip(i)}
              onMouseLeave={() => setTooltip(null)}
            >
              {tooltip === i && d.value != null && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs bg-zinc-800 text-white px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                  {d.value}
                </div>
              )}
              <div
                className={`w-full rounded-sm transition-opacity ${isToday ? 'opacity-100' : 'opacity-70'}`}
                style={{
                  height: `${h}%`,
                  backgroundColor: COLORS[color]?.hex ?? '#3b82f6',
                  minHeight: d.value != null && d.value > 0 ? 4 : 0,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-0.5 mt-1">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center" style={{ fontSize: 8, color: '#71717a' }}>
            {i % 3 === 0 ? formatShort(d.date).split(' ')[1] : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({ data, target, color, days }) {
  const [tooltip, setTooltip] = useState(null);
  const maxVal = Math.max(...data.map(d => d.value ?? 0), target ?? 0, 1);
  const W = 280, H = 110, PAD = 12;
  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2);
    const y = d.value != null ? PAD + ((1 - d.value / maxVal) * (H - PAD * 2)) : null;
    return { x, y, ...d };
  });

  const pathD = pts.reduce((acc, p, i) => {
    if (p.y == null) return acc;
    const prev = pts[i - 1];
    if (acc === '' || prev?.y == null) return `M ${p.x} ${p.y}`;
    return acc + ` L ${p.x} ${p.y}`;
  }, '');

  const hexColor = COLORS[color]?.hex ?? '#3b82f6';
  const targetY = target > 0 ? PAD + ((1 - target / maxVal) * (H - PAD * 2)) : null;

  return (
    <div className="relative w-full overflow-hidden">
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        {targetY != null && (
          <>
            <line x1={PAD} y1={targetY} x2={W - PAD} y2={targetY}
              stroke="#71717a" strokeDasharray="4 3" strokeWidth="1" />
            <text x={W - PAD} y={targetY - 3} fill="#71717a" fontSize="8" textAnchor="end">Target</text>
          </>
        )}
        {pathD && (
          <path d={pathD} fill="none" stroke={hexColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {pts.map((p, i) => p.y != null && (
          <g key={p.date}>
            <circle
              cx={p.x} cy={p.y} r="3.5" fill={hexColor}
              className="cursor-pointer"
              onMouseEnter={() => setTooltip(i)}
              onMouseLeave={() => setTooltip(null)}
            />
            {tooltip === i && (
              <g>
                <rect x={p.x - 14} y={p.y - 20} width="28" height="14" rx="3" fill="#27272a" />
                <text x={p.x} y={p.y - 10} fill="white" fontSize="8" textAnchor="middle">{p.value}</text>
              </g>
            )}
          </g>
        ))}
      </svg>
      <div className="flex gap-0.5 mt-1">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center" style={{ fontSize: 8, color: '#71717a' }}>
            {i % 3 === 0 ? formatShort(d.date).split(' ')[1] : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function HeatmapChart({ data, color }) {
  const [tooltip, setTooltip] = useState(null);
  const maxVal = Math.max(...data.map(d => d.value ?? 0), 1);
  const hexColor = COLORS[color]?.hex ?? '#3b82f6';

  return (
    <div>
      <div className="flex gap-1.5 flex-wrap">
        {data.map((d, i) => {
          const intensity = d.value != null && d.value > 0 ? d.value / maxVal : 0;
          const isToday = d.date === TODAY();
          return (
            <div
              key={d.date}
              className="relative cursor-pointer"
              onMouseEnter={() => setTooltip(i)}
              onMouseLeave={() => setTooltip(null)}
            >
              <div
                className={`w-7 h-7 rounded ${isToday ? 'ring-1 ring-white/30' : ''}`}
                style={{
                  backgroundColor: intensity > 0
                    ? hexColor + Math.round(intensity * 220 + 35).toString(16).padStart(2, '0')
                    : '#27272a',
                }}
              />
              {tooltip === i && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-zinc-800 text-white px-2 py-1 rounded whitespace-nowrap z-10">
                  {d.value ?? 'No data'} — {formatShort(d.date)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Add Habit Screen ─────────────────────────────────────────────────────────

function AddHabitScreen({ habits, onAdd, onBack }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [categoryInput, setCategoryInput] = useState('');
  const [color, setColor] = useState('blue');
  const [type, setType] = useState('boolean');
  const [target, setTarget] = useState('');
  const [strict, setStrict] = useState(false);
  const [chartType, setChartType] = useState('Bar');

  const existingCategories = [...new Set(habits.map(h => h.category).filter(Boolean))];

  const handleSubmit = () => {
    if (!name.trim()) return;
    const cat = categoryInput.trim() || category || 'General';
    onAdd({
      id: Date.now().toString(),
      name: name.trim(),
      category: cat,
      color,
      type,
      target: type === 'numeric' && target ? Number(target) : null,
      strict,
      chartType,
    });
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={onBack} className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold tracking-tight">New Protocol</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-5">
        {/* Name */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Protocol Name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g., Deep Work, Hydration…"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Category</label>
          {existingCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {existingCategories.map(c => (
                <button
                  key={c}
                  onClick={() => { setCategory(c); setCategoryInput(''); }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${category === c && !categoryInput ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          <input
            type="text"
            value={categoryInput}
            onChange={e => { setCategoryInput(e.target.value); setCategory(''); }}
            placeholder="Or type a new category…"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
          />
        </div>

        {/* Color / Aura */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Aura</label>
          <div className="flex gap-3">
            {Object.entries(COLORS).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setColor(key)}
                className={`w-8 h-8 rounded-full transition-all ${val.bg} ${color === key ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : 'opacity-60 hover:opacity-90'}`}
              />
            ))}
          </div>
        </div>

        {/* Tracking Type */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Tracking Type</label>
          <div className="flex gap-2">
            {['boolean', 'numeric'].map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors capitalize ${type === t ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
              >
                {t === 'boolean' ? 'Boolean' : 'Numeric'}
              </button>
            ))}
          </div>
          {type === 'numeric' && (
            <div className="mt-2">
              <input
                type="number"
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder="Optional target (e.g., 8 glasses)"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Strict Mode */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-100">Strict Mode</p>
              <p className="text-xs text-zinc-500 mt-0.5">Any missed day instantly resets your streak to zero.</p>
            </div>
            <button onClick={() => setStrict(!strict)} className="transition-colors">
              {strict
                ? <ToggleRight size={28} className="text-rose-400" />
                : <ToggleLeft size={28} className="text-zinc-600" />}
            </button>
          </div>
          {!strict && (
            <p className="text-xs text-zinc-600 border-t border-zinc-800 pt-3">
              <span className="text-zinc-500">Flexible Mode:</span> Empty days pause your streak. It only breaks if you explicitly mark a day as failed.
            </p>
          )}
        </div>

        {/* Chart Type */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Visualization</label>
          <div className="flex gap-2">
            {CHART_TYPES.map(ct => {
              const Icon = ct === 'Bar' ? BarChart2 : ct === 'Line' ? Activity : Grid;
              return (
                <button
                  key={ct}
                  onClick={() => setChartType(ct)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-colors ${chartType === ct ? 'bg-zinc-700 text-zinc-100' : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300'}`}
                >
                  <Icon size={16} />
                  {ct}
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="w-full py-4 rounded-xl text-sm font-semibold text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={name.trim() ? { backgroundColor: COLORS[color].hex, ...glowStyle(color) } : { backgroundColor: '#71717a' }}
        >
          Initialize Protocol
        </button>
      </div>
    </div>
  );
}

// ─── Habit Card ───────────────────────────────────────────────────────────────

function HabitCard({ habit, entry, onLog, onSkip, streak }) {
  const [numInput, setNumInput] = useState('');
  const colorHex = COLORS[habit.color]?.hex ?? '#3b82f6';
  const done = isCompleted(habit, entry);
  const brokenToday = streakBrokenToday(habit, entry ? { [TODAY()]: entry } : {});

  const handleNumSubmit = () => {
    if (numInput === '') return;
    onLog(habit.id, { value: Number(numInput), done: true });
    setNumInput('');
  };

  return (
    <div
      className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-4 space-y-3 transition-all"
      style={done ? glowStyle(habit.color, 0.3) : {}}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {colorDot(habit.color)}
          <span className="text-sm font-medium text-zinc-100 truncate">{habit.name}</span>
          {brokenToday && (
            <Zap size={14} className="text-rose-400 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Flame size={13} className={streak > 0 ? 'text-orange-400' : 'text-zinc-700'} />
          <span className={`text-xs font-semibold tabular-nums ${streak > 0 ? 'text-orange-400' : 'text-zinc-600'}`}>{streak}</span>
        </div>
      </div>

      {habit.target != null && (
        <div className="flex items-center gap-1 text-xs text-zinc-500">
          <Target size={11} />
          <span>Target: {habit.target}</span>
          {entry?.value != null && (
            <span className={Number(entry.value) >= Number(habit.target) ? 'text-green-400' : 'text-zinc-400'}>
              {' '}· Logged: {entry.value}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        {habit.type === 'boolean' ? (
          <button
            onClick={() => onLog(habit.id, done ? null : { done: true })}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={done
              ? { backgroundColor: colorHex + '30', color: colorHex, border: `1px solid ${colorHex}60` }
              : { backgroundColor: '#18181b', color: '#71717a', border: '1px solid #27272a' }
            }
          >
            {done ? <Check size={15} /> : null}
            {done ? 'Done' : 'Mark Done'}
          </button>
        ) : (
          <>
            <input
              type="number"
              value={numInput}
              onChange={e => setNumInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNumSubmit()}
              placeholder={entry?.value != null ? String(entry.value) : '0'}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 tabular-nums"
            />
            <button
              onClick={handleNumSubmit}
              className="p-2.5 rounded-xl transition-all"
              style={{ backgroundColor: colorHex + '25', color: colorHex }}
            >
              <Check size={16} />
            </button>
          </>
        )}
        <button
          onClick={() => onSkip(habit.id)}
          title="Mark as failed"
          className={`p-2.5 rounded-xl transition-colors ${entry?.skipped ? 'bg-rose-900/40 text-rose-400' : 'bg-zinc-900 text-zinc-600 hover:text-zinc-400'}`}
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ habits, logs, onLog, onSkip, onAdd }) {
  const [viewDate, setViewDate] = useState(TODAY());
  const isToday = viewDate === TODAY();

  const categories = [...new Set(habits.map(h => h.category))].filter(Boolean);

  const getEntry = (habitId) => logs[viewDate]?.[habitId];
  const getStreak = (habit) => computeStreak(habit, logs['__all__']?.[habit.id] ?? {});

  if (habits.length === 0) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <button
          onClick={onAdd}
          className="w-20 h-20 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{ boxShadow: '0 0 40px #3b82f640' }}
        >
          <Plus size={32} className="text-blue-400" />
        </button>
        <p className="mt-4 text-zinc-600 text-sm">Initialize your first Protocol</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Date Nav */}
      <div className="flex items-center justify-between px-4 pt-6 pb-3">
        <button onClick={() => setViewDate(d => addDays(d, -1))} className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-100">{isToday ? 'Today' : formatDate(viewDate)}</p>
          {!isToday && <p className="text-xs text-zinc-600">{formatDate(viewDate)}</p>}
        </div>
        <button
          onClick={() => setViewDate(d => addDays(d, 1))}
          disabled={isToday}
          className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-6">
        {categories.map(cat => {
          const catHabits = habits.filter(h => h.category === cat);
          return (
            <div key={cat}>
              <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-3">{cat}</p>
              <div className="space-y-3">
                {catHabits.map(habit => (
                  <HabitCard
                    key={habit.id}
                    habit={habit}
                    entry={getEntry(habit.id)}
                    streak={getStreak(habit)}
                    onLog={onLog}
                    onSkip={onSkip}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <div className="fixed bottom-24 right-4">
        <button
          onClick={onAdd}
          className="w-13 h-13 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: '#3b82f6', boxShadow: '0 0 20px #3b82f650', width: 52, height: 52 }}
        >
          <Plus size={22} className="text-white" />
        </button>
      </div>
    </div>
  );
}

// ─── Telemetry General View ───────────────────────────────────────────────────

function TelemetryGeneral({ habits, logs, onSelectHabit }) {
  const today = TODAY();

  const globalBestStreak = habits.reduce((best, h) => {
    const b = computeBestStreak(h, logs['__all__']?.[h.id] ?? {});
    return Math.max(best, b);
  }, 0);

  const completedToday = habits.filter(h => isCompleted(h, logs[today]?.[h.id])).length;
  const completionPct = habits.length > 0 ? Math.round((completedToday / habits.length) * 100) : 0;

  const last14 = last14Days(today);
  const successRate = (habit) => {
    const days = last14.filter(d => {
      const e = logs[d]?.[habit.id];
      return isCompleted(habit, e);
    });
    return Math.round((days.length / 14) * 100);
  };

  return (
    <div className="flex-1 overflow-y-auto pb-8 space-y-6">
      {/* Global Stats */}
      <div className="grid grid-cols-2 gap-3 px-4 pt-4">
        <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Flame size={14} className="text-orange-400" />
            <span className="text-xs text-zinc-500 font-medium">Best Streak</span>
          </div>
          <p className="text-3xl font-bold tabular-nums text-zinc-100">{globalBestStreak}</p>
          <p className="text-xs text-zinc-600 mt-0.5">days — all protocols</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <Check size={14} className="text-green-400" />
            <span className="text-xs text-zinc-500 font-medium">Today</span>
          </div>
          <p className="text-3xl font-bold tabular-nums text-zinc-100">{completionPct}%</p>
          <p className="text-xs text-zinc-600 mt-0.5">{completedToday}/{habits.length} complete</p>
        </div>
      </div>

      {/* Protocol List */}
      <div className="px-4 space-y-2">
        <p className="text-xs font-semibold text-zinc-600 uppercase tracking-widest mb-3">14-Day Rate</p>
        {habits.map(habit => {
          const rate = successRate(habit);
          const colorHex = COLORS[habit.color]?.hex ?? '#3b82f6';
          return (
            <button
              key={habit.id}
              onClick={() => onSelectHabit(habit)}
              className="w-full bg-zinc-950 border border-zinc-800/60 rounded-2xl p-4 flex items-center gap-3 hover:border-zinc-700 transition-colors text-left"
            >
              {colorDot(habit.color)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-100 truncate">{habit.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, backgroundColor: colorHex }} />
                  </div>
                  <span className="text-xs tabular-nums text-zinc-500 shrink-0">{rate}%</span>
                </div>
              </div>
              <ChevronRight size={14} className="text-zinc-600 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Telemetry Specific View ──────────────────────────────────────────────────

function TelemetrySpecific({ habit, logs, onBack }) {
  const habitLogs = logs['__all__']?.[habit.id] ?? {};
  const streak = computeStreak(habit, habitLogs);
  const bestStreak = computeBestStreak(habit, habitLogs);
  const totalLogs = Object.values(habitLogs).filter(e => e && !e.skipped && (e.done || e.value != null)).length;

  const endDate = TODAY();
  const days = last14Days(endDate);
  const chartData = days.map(d => {
    const e = habitLogs[d];
    if (!e || e.skipped) return { date: d, value: null };
    if (habit.type === 'boolean') return { date: d, value: e.done ? 1 : null };
    return { date: d, value: e.value != null ? Number(e.value) : null };
  });

  const colorHex = COLORS[habit.color]?.hex ?? '#3b82f6';

  return (
    <div className="flex-1 overflow-y-auto pb-8">
      <div className="px-4 pt-2 pb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors text-sm mb-4">
          <ArrowLeft size={14} />
          All Protocols
        </button>

        <div className="flex items-center gap-2 mb-5">
          {colorDot(habit.color)}
          <h2 className="text-lg font-semibold text-zinc-100">{habit.name}</h2>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { label: 'Streak', value: streak, icon: <Flame size={13} className="text-orange-400" /> },
            { label: 'Best', value: bestStreak, icon: <TrendingUp size={13} className="text-green-400" /> },
            { label: 'Logs', value: totalLogs, icon: <Hash size={13} className="text-blue-400" /> },
          ].map(s => (
            <div key={s.label} className="bg-zinc-950 border border-zinc-800/60 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">{s.icon}</div>
              <p className="text-xl font-bold tabular-nums text-zinc-100">{s.value}</p>
              <p className="text-xs text-zinc-600">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-zinc-950 border border-zinc-800/60 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">14-Day Data</p>
            <div className="flex items-center gap-1">
              {habit.chartType === 'Bar' && <BarChart2 size={13} className="text-zinc-500" />}
              {habit.chartType === 'Line' && <Activity size={13} className="text-zinc-500" />}
              {habit.chartType === 'Heatmap' && <Grid size={13} className="text-zinc-500" />}
              <span className="text-xs text-zinc-600">{habit.chartType}</span>
            </div>
          </div>

          {habit.chartType === 'Bar' && (
            <BarChart data={chartData} target={habit.target} color={habit.color} days={days} />
          )}
          {habit.chartType === 'Line' && (
            <LineChart data={chartData} target={habit.target} color={habit.color} days={days} />
          )}
          {habit.chartType === 'Heatmap' && (
            <HeatmapChart data={chartData} color={habit.color} />
          )}
        </div>

        {/* Meta */}
        <div className="mt-4 bg-zinc-950 border border-zinc-800/60 rounded-2xl p-4 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Type</span>
            <span className="text-zinc-300 capitalize">{habit.type}</span>
          </div>
          {habit.target && (
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Target</span>
              <span className="text-zinc-300">{habit.target}</span>
            </div>
          )}
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Mode</span>
            <span className={habit.strict ? 'text-rose-400' : 'text-green-400'}>{habit.strict ? 'Strict' : 'Flexible'}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Chart</span>
            <span className="text-zinc-300">{habit.chartType}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Telemetry Screen ─────────────────────────────────────────────────────────

function TelemetryScreen({ habits, logs }) {
  const [selectedHabit, setSelectedHabit] = useState(null);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="px-4 pt-6 pb-3">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">Telemetry</h1>
        <p className="text-xs text-zinc-600 mt-0.5">System performance overview</p>
      </div>

      {habits.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-600 text-sm">No protocols initialized yet.</p>
        </div>
      ) : selectedHabit ? (
        <TelemetrySpecific
          habit={selectedHabit}
          logs={logs}
          onBack={() => setSelectedHabit(null)}
        />
      ) : (
        <TelemetryGeneral
          habits={habits}
          logs={logs}
          onSelectHabit={setSelectedHabit}
        />
      )}
    </div>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────

function BottomNav({ screen, onNavigate }) {
  const tabs = [
    { id: 'dashboard', icon: <Layers size={20} />, label: 'Protocols' },
    { id: 'telemetry', icon: <Activity size={20} />, label: 'Telemetry' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-zinc-900 flex">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onNavigate(t.id)}
          className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${screen === t.id ? 'text-blue-400' : 'text-zinc-600 hover:text-zinc-400'}`}
        >
          {t.icon}
          <span className="text-xs font-medium">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [data, setData] = useState(() => loadData());
  const [screen, setScreen] = useState('dashboard');
  const [showAdd, setShowAdd] = useState(false);

  // Persist on change
  useEffect(() => { saveData(data); }, [data]);

  // data.logs structure:
  //   logs[date][habitId] = entry   — for daily view
  //   logs['__all__'][habitId][date] = entry  — for analytics / streak calc
  const syncLog = useCallback((habitId, date, entry) => {
    setData(prev => {
      const dateMap = { ...prev.logs[date], [habitId]: entry };
      const allHabit = { ...(prev.logs['__all__']?.[habitId] ?? {}), [date]: entry };
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [date]: dateMap,
          __all__: {
            ...(prev.logs['__all__'] ?? {}),
            [habitId]: allHabit,
          },
        },
      };
    });
  }, []);

  const handleLog = useCallback((habitId, entry) => {
    const today = TODAY();
    syncLog(habitId, today, entry);
  }, [syncLog]);

  const handleSkip = useCallback((habitId) => {
    const today = TODAY();
    setData(prev => {
      const existing = prev.logs[today]?.[habitId];
      const entry = existing?.skipped ? null : { skipped: true };
      const dateMap = { ...prev.logs[today], [habitId]: entry };
      const allHabit = { ...(prev.logs['__all__']?.[habitId] ?? {}), [today]: entry };
      return {
        ...prev,
        logs: {
          ...prev.logs,
          [today]: dateMap,
          __all__: {
            ...(prev.logs['__all__'] ?? {}),
            [habitId]: allHabit,
          },
        },
      };
    });
  }, []);

  const handleAddHabit = useCallback((habit) => {
    setData(prev => ({ ...prev, habits: [...prev.habits, habit] }));
    setShowAdd(false);
  }, []);

  if (showAdd) {
    return (
      <AddHabitScreen
        habits={data.habits}
        onAdd={handleAddHabit}
        onBack={() => setShowAdd(false)}
      />
    );
  }

  return (
    <div className="bg-black min-h-screen max-w-md mx-auto">
      {screen === 'dashboard' && (
        <Dashboard
          habits={data.habits}
          logs={data.logs}
          onLog={handleLog}
          onSkip={handleSkip}
          onAdd={() => setShowAdd(true)}
        />
      )}
      {screen === 'telemetry' && (
        <TelemetryScreen
          habits={data.habits}
          logs={data.logs}
        />
      )}
      <BottomNav screen={screen} onNavigate={setScreen} />
    </div>
  );
}
