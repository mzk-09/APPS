import { useState } from 'react';
import { Plus, BarChart2 } from 'lucide-react';
import { DateNavigation } from './components/DateNavigation';
import { Dashboard } from './components/Dashboard';
import { AddHabitModal } from './components/AddHabitModal';
import { Analytics } from './components/Analytics';
import { GlowWrap } from './components/ui';

function App() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white max-w-md mx-auto w-full relative border-x border-zinc-900 shadow-2xl overflow-hidden flex flex-col">
      <DateNavigation />

      <Dashboard />

      {/* Floating Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-6 flex justify-center items-end gap-6 pointer-events-none z-40 bg-gradient-to-t from-black via-black/80 to-transparent pt-20">
        <div className="pointer-events-auto flex items-center gap-6">
          <GlowWrap active={true} color="#ffffff">
            <button
              onClick={() => setShowAddModal(true)}
              className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 transition-transform"
            >
              <Plus className="w-8 h-8" />
            </button>
          </GlowWrap>

          <button
            onClick={() => setShowAnalytics(true)}
            className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center hover:bg-zinc-800 transition-colors"
          >
            <BarChart2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {showAddModal && <AddHabitModal onClose={() => setShowAddModal(false)} />}
      {showAnalytics && <Analytics onClose={() => setShowAnalytics(false)} />}
    </div>
  );
}

export default App;
