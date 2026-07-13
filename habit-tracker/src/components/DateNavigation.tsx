
import { useStore } from '../store';
import { format, addDays, subDays, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from './ui';

export function DateNavigation() {
  const { selectedDate, setSelectedDate } = useStore();

  const currentDate = new Date(selectedDate);

  const handlePrevDay = () => setSelectedDate(format(subDays(currentDate, 1), 'yyyy-MM-dd'));
  const handleNextDay = () => setSelectedDate(format(addDays(currentDate, 1), 'yyyy-MM-dd'));
  const handleToday = () => setSelectedDate(format(new Date(), 'yyyy-MM-dd'));

  return (
    <div className="flex items-center justify-between py-4 px-2 border-b border-zinc-800 bg-black sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={handlePrevDay}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex flex-col items-center min-w-[120px]">
          <span className="text-lg font-bold text-white tracking-wide">
            {isToday(currentDate) ? 'Today' : format(currentDate, 'MMM d')}
          </span>
          <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
            {format(currentDate, 'EEEE')}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleNextDay}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {!isToday(currentDate) && (
        <Button variant="secondary" size="sm" onClick={handleToday} className="flex gap-2">
          <CalendarIcon className="w-4 h-4" />
          Today
        </Button>
      )}
    </div>
  );
}
