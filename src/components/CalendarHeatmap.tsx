import { useStore } from '../store/useStore';

const CalendarHeatmap = () => {
    const { historicalDays, targetKcal, targetProtein, consumedKcal, consumedProtein } = useStore();

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();

    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    // Build a map: day number -> { kcal, protein }
    const dayMap = new Map<number, { kcal: number; protein: number }>();

    // Today's data
    dayMap.set(today, { kcal: consumedKcal, protein: consumedProtein });

    // Historical data
    historicalDays?.forEach(day => {
        if (day.entries && day.entries.length > 0) {
            const d = new Date(Number(day.entries[0].timestamp));
            if (d.getMonth() === month && d.getFullYear() === year) {
                dayMap.set(d.getDate(), { kcal: day.kcal, protein: day.protein });
            }
        }
    });

    const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const getColor = (dayNum: number): string => {
        const data = dayMap.get(dayNum);
        if (!data || (data.kcal === 0 && data.protein === 0)) return 'bg-brutal-black/5';

        const kcalHit = data.kcal <= targetKcal && data.kcal > 0;
        const proteinHit = data.protein >= targetProtein;

        if (kcalHit && proteinHit) return 'bg-green-400/60';
        if (kcalHit || proteinHit) return 'bg-brutal-black/15';

        // Neither hit — red, pulse if kcal > 50% target
        if (data.kcal > targetKcal * 0.5) return 'bg-signal-red/40 animate-pulse';
        return 'bg-signal-red/30';
    };

    // Build grid cells
    const cells: React.ReactNode[] = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        cells.push(<div key={`empty-${i}`} className="w-full aspect-square" />);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
        const isFuture = d > today;
        const isToday = d === today;

        cells.push(
            <div
                key={d}
                className={`w-full aspect-square rounded-[4px] transition-all duration-300 ${isFuture
                        ? 'bg-transparent'
                        : getColor(d)
                    } ${isToday ? 'ring-1 ring-brutal-black/40 ring-offset-1' : ''}`}
                title={
                    isFuture ? '' :
                        dayMap.has(d)
                            ? `${dayMap.get(d)!.kcal} kcal / ${dayMap.get(d)!.protein}g protein`
                            : 'No data'
                }
            />
        );
    }

    return (
        <div className="w-full mt-6 mb-4">
            <div className="flex items-center justify-between mb-3 px-1">
                <span className="font-sans text-[10px] uppercase tracking-[0.2em] opacity-40 font-bold">{monthName}</span>
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
