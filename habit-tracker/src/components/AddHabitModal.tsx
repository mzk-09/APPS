import React, { useState } from 'react';
import { useStore } from '../store';
import type { TrackingType, AnalyticsConfig } from '../store';
import { X, Plus } from 'lucide-react';
import { Button, Input, Switch, Select, Label, ColorPicker } from './ui';

interface AddHabitModalProps {
  onClose: () => void;
}

export function AddHabitModal({ onClose }: AddHabitModalProps) {
  const { categories, addHabit, addCategory } = useStore();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const [color, setColor] = useState('#3b82f6'); // Default blue
  const [trackingType, setTrackingType] = useState<TrackingType>('boolean');
  const [target, setTarget] = useState('');
  const [strictMode, setStrictMode] = useState(false);
  const [analyticsConfig, setAnalyticsConfig] = useState<AnalyticsConfig>('line');

  const handleCreateCategory = () => {
    if (newCategoryName.trim()) {
      const newCatId = `cat-${Math.random().toString(36).substring(2, 9)}`;
      addCategory(newCategoryName.trim(), newCatId);
      setCategoryId(newCatId);
      // The new category won't immediately be available in state for setting ID perfectly here without refetching,
      // but Zustand will update the UI. We'll reset the form.
      setIsCreatingCategory(false);
      setNewCategoryName('');
      // Ideally we'd set categoryId to the new id, but it requires ID generation logic match.
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) return;

    addHabit({
      name: name.trim(),
      categoryId,
      color,
      trackingType,
      target: trackingType === 'numeric' && target ? Number(target) : undefined,
      strictMode,
      analyticsConfig,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">New Habit</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex-1 flex flex-col gap-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Habit Name</Label>
              <Input
                id="name"
                placeholder="e.g., Drink Water, Read 10 pages"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              {isCreatingCategory ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="New category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <Button type="button" variant="secondary" onClick={handleCreateCategory}>Add</Button>
                  <Button type="button" variant="ghost" onClick={() => setIsCreatingCategory(false)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                  <Button type="button" variant="secondary" size="icon" onClick={() => setIsCreatingCategory(true)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <ColorPicker value={color} onChange={setColor} />
            </div>
          </div>

          <hr className="border-zinc-800" />

          {/* Tracking Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tracking Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={trackingType === 'boolean' ? 'primary' : 'secondary'}
                  onClick={() => setTrackingType('boolean')}
                >
                  Done / Not Done
                </Button>
                <Button
                  type="button"
                  variant={trackingType === 'numeric' ? 'primary' : 'secondary'}
                  onClick={() => setTrackingType('numeric')}
                >
                  Numeric
                </Button>
              </div>
            </div>

            {trackingType === 'numeric' && (
              <div className="space-y-2">
                <Label htmlFor="target">Target Value (optional)</Label>
                <Input
                  id="target"
                  type="number"
                  placeholder="e.g., 100"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </div>
            )}
          </div>

          <hr className="border-zinc-800" />

          {/* Strict Mode */}
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-white text-base">Strict Mode</Label>
                <p className="text-xs text-zinc-500 mt-1">Missing a day resets streak to 0 immediately.</p>
              </div>
              <Switch checked={strictMode} onChange={(e) => setStrictMode(e.target.checked)} />
            </div>
            {strictMode && (
              <div className="text-xs text-red-500 font-medium mt-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-pulse"></span>
                Streak breaks are final. No partial credit.
              </div>
            )}
          </div>

          <hr className="border-zinc-800" />

          {/* Analytics Config */}
          <div className="space-y-2 pb-4">
            <Label>Default Chart Type</Label>
            <Select
              value={analyticsConfig}
              onChange={(e) => setAnalyticsConfig(e.target.value as AnalyticsConfig)}
            >
              <option value="line">Line Graph</option>
              <option value="bar">Bar Chart</option>
              <option value="heatmap">Heatmap</option>
              <option value="none">None</option>
            </Select>
          </div>

          <div className="sticky bottom-0 bg-zinc-950 pt-4 mt-auto">
            <Button type="submit" className="w-full" size="lg" disabled={!name.trim() || !categoryId}>
              Create Habit
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
