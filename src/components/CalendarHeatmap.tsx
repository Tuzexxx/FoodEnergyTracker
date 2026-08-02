import { useState } from 'react';
import { useStore, EXERCISE_BONUS_KCAL, EXERCISE_BONUS_PROTEIN } from '../store/useStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CalendarHeatmap = () => {
    const { historicalDays, historicalExerciseDays, targetKcal, targetProtein, consumedKcal, consumedProtein, setViewedHistoryDate, exerciseDay } = useStore();

    const [viewMonth, setViewMonth] = useState(new Date());

    const now = new Date();
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
    const today = isCurrentMonth ? now.getDate() : -1;

    const firstDaySun = new Date(year, month, 1).getDay(); // 0=Sun
    const firstDay = firstDaySun === 0 ? 6 : firstDaySun - 1; // Convert to Mon=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const handlePrevMonth = () => {
        setViewMonth(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        if (!isCurrentMonth) {
            setViewMonth(new Date(year, month + 1, 1));
        }
    };

    // Build a map: day number -> { kcal, protein }
    const dayMap = new Map<number, { kcal: number; protein: number; targetKcal?: number; targetProtein?: number }>();

    // Today's data (only for current month)
    if (isCurrentMonth) {
        dayMap.set(now.getDate(), { kcal: consumedKcal, protein: consumedProtein, targetKcal, targetProtein });
    }

    // Historical data
    historicalDays?.forEach(day => {
        if (day.entries && day.entries.length > 0) {
            const d = new Date(Number(day.entries[0].timestamp));
            if (d.getMonth() === month && d.getFullYear() === year) {
                dayMap.set(d.getDate(), { kcal: day.kcal, protein: day.protein, targetKcal: day.targetKcal, targetProtein: day.targetProtein });
            }
        }
    });

    const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    const getColor = (dayNum: number): string => {
        const data = dayMap.get(dayNum);
        if (!data || (data.kcal === 0 && data.protein === 0)) return 'bg-brutal-black/5';

        const dObj = new Date(year, month, dayNum);
        const realDateStr = dObj.toDateString();

        let effectiveTargetKcal = targetKcal;
        let effectiveTargetProtein = targetProtein;
        if (isCurrentMonth && dayNum === now.getDate()) {
            effectiveTargetKcal = targetKcal + (exerciseDay ? EXERCISE_BONUS_KCAL : 0);
            effectiveTargetProtein += exerciseDay ? EXERCISE_BONUS_PROTEIN : 0;
        } else if (historicalExerciseDays?.includes(realDateStr)) {
            effectiveTargetKcal = targetKcal + EXERCISE_BONUS_KCAL;
            effectiveTargetProtein += EXERCISE_BONUS_PROTEIN;
        }

        const kcalHit = data.kcal <= effectiveTargetKcal && data.kcal > 0;
        const proteinHit = data.protein >= effectiveTargetProtein;

        if (kcalHit && proteinHit) return 'bg-green-400/60';
        if (kcalHit || proteinHit) return 'bg-brutal-black/15';

        // Neither hit — red, pulse if kcal > 50% target
        if (data.kcal > effectiveTargetKcal * 0.5) return 'bg-signal-red/40 animate-pulse';
        return 'bg-signal-red/30';
    };

    const handleDayClick = (d: number) => {
        if (!dayMap.has(d)) return;
        
        const clickedDate = new Date(year, month, d);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        // Don't open today's modal (it's handled in the main timeline)
        if (clickedDate.getTime() >= startOfDay.getTime()) return;

        const startOfYesterday = new Date(startOfDay);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);

        let dateStr = clickedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        if (clickedDate.getTime() >= startOfYesterday.getTime()) {
            dateStr = 'Yesterday';
        }

        setViewedHistoryDate(dateStr);
    };

    // Build grid cells
    const cells: React.ReactNode[] = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        cells.push(<div key={`empty-${i}`} className="w-full aspect-square" />);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
        const isFuture = (year > now.getFullYear()) || (year === now.getFullYear() && month > now.getMonth()) || (isCurrentMonth && d > today);
        const isToday = isCurrentMonth && d === today;
        const hasData = dayMap.has(d);
        const isClickable = hasData && !isToday;

        cells.push(
            <div
                key={d}
                onClick={() => isClickable && handleDayClick(d)}
                className={`w-full aspect-square rounded-[4px] transition-all duration-300 flex items-center justify-center ${isFuture
                        ? 'bg-transparent'
                        : getColor(d)
                    } ${isToday ? 'ring-1 ring-brutal-black/40 ring-offset-1' : ''} ${isClickable ? 'cursor-pointer hover:opacity-80 active:scale-95 hover:shadow-sm' : ''}`}
                title={
                    isFuture ? '' :
                        hasData
                            ? `${dayMap.get(d)!.kcal} kcal / ${dayMap.get(d)!.protein}g protein`
                            : 'No data'
                }
            >
                <span className={`font-sans text-[8px] font-bold ${isFuture ? 'opacity-15' : 'opacity-40'}`}>{d}</span>
            </div>
        );
    }

    return (
        <div className="w-full mt-6 mb-4">
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-3">
                    <button onClick={handlePrevMonth} className="opacity-40 hover:opacity-100 hover:bg-black/5 p-1 rounded-full transition-all">
                        <ChevronLeft size={16} />
                    </button>
                    <span className="font-sans text-[10px] uppercase tracking-[0.2em] opacity-40 font-bold min-w-[100px] text-center">
                        {monthName}
                    </span>
                    <button 
                        onClick={handleNextMonth} 
                        className={`p-1 rounded-full transition-all ${isCurrentMonth ? 'opacity-15 cursor-not-allowed' : 'opacity-40 hover:opacity-100 hover:bg-black/5'}`}
                        disabled={isCurrentMonth}
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-[2px] bg-green-400/60" />
                        <span className="text-[8px] font-sans opacity-40">Both</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-[2px] bg-brutal-black/15" />
                        <span className="text-[8px] font-sans opacity-40">One</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-[2px] bg-signal-red/40" />
                        <span className="text-[8px] font-sans opacity-40">None</span>
                    </div>
                </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
                {weekDays.map((d, i) => (
                    <div key={i} className="text-center font-sans text-[8px] uppercase opacity-30 font-bold">{d}</div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
                {cells}
            </div>
        </div>
    );
};

export default CalendarHeatmap;
