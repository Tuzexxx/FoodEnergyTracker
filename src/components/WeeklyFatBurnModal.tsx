import { useState, useMemo } from 'react';
import { Flame, Watch, Sparkles, X, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { calculateWeeklyDeficitTelemetry } from '../utils/calorieFormula';

interface CompletedDaysTelemetry {
    daysCount: number;
    consumedKcal: number;
    exerciseDaysCount: number;
    dateRangeLabel: string;
    telemetry: ReturnType<typeof calculateWeeklyDeficitTelemetry> | null;
}

export function useCompletedDaysTelemetry(period: '7d' | '30d'): CompletedDaysTelemetry {
    const {
        profile,
        historicalDays,
        historicalExerciseDays,
        smartwatchWeeklyBurn,
        smartwatchMonthlyBurn,
    } = useStore();

    return useMemo(() => {
        const sliceCount = period === '7d' ? 7 : 30;
        // Filter strictly to completed historical days where calories were logged (> 0)
        const validLoggedDays = (historicalDays || []).filter(d => (d.kcal || 0) > 0);
        const completedDays = validLoggedDays.slice(0, sliceCount);
        const daysCount = Math.max(1, completedDays.length);

        let sumKcal = 0;
        let gymCount = 0;

        completedDays.forEach(day => {
            sumKcal += (day.kcal || 0);
            if (day.realDateStr && historicalExerciseDays?.includes(day.realDateStr)) {
                gymCount += 1;
            }
        });

        // Date range label from oldest logged day in range to newest completed day
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let dateRangeLabel = `${daysCount} logged days`;
        if (completedDays.length > 0) {
            const newest = completedDays[0];
            const oldest = completedDays[completedDays.length - 1];
            
            const formatDate = (dateStr: string) => {
                if (dateStr === 'Yesterday') {
                    const y = new Date();
                    y.setDate(y.getDate() - 1);
                    return `${months[y.getMonth()]} ${y.getDate()}`;
                }
                return dateStr.replace(/, \d{4}$/, '');
            };

            dateRangeLabel = `${formatDate(oldest.dateStr)} - ${formatDate(newest.dateStr)} (${daysCount} logged days)`;
        }

        const watchBurn = period === '7d' ? smartwatchWeeklyBurn : smartwatchMonthlyBurn;

        const telemetry = profile ? calculateWeeklyDeficitTelemetry({
            weight: profile.weight,
            height: profile.height,
            age: profile.age,
            gender: profile.gender,
            activityLevel: profile.activityLevel || 'LIGHT',
            weeklyConsumedKcal: sumKcal,
            exerciseDaysCount: gymCount,
            daysCount: daysCount, // Accurately scales baseline maintenance burn to actual logged days
            smartwatchBurnKcal: watchBurn,
        }) : null;

        return {
            daysCount,
            consumedKcal: sumKcal,
            exerciseDaysCount: gymCount,
            dateRangeLabel,
            telemetry
        };
    }, [profile, historicalDays, historicalExerciseDays, smartwatchWeeklyBurn, smartwatchMonthlyBurn, period]);
}

/** Live telemetry trigger button embedded into the food input toolbar */
export const WeeklyFatBurnTrigger = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [timeframeMode, setTimeframeMode] = useState<'7d' | '30d'>('7d');
    const { daysCount, consumedKcal, exerciseDaysCount, dateRangeLabel, telemetry } = useCompletedDaysTelemetry(timeframeMode);
    const {
        smartwatchWeeklyBurn,
        setSmartwatchWeeklyBurn,
        smartwatchMonthlyBurn,
        setSmartwatchMonthlyBurn,
    } = useStore();

    const currentWatchBurn = timeframeMode === '7d' ? smartwatchWeeklyBurn : smartwatchMonthlyBurn;
    const [smartwatchInput, setSmartwatchInput] = useState(currentWatchBurn ? currentWatchBurn.toString() : '');

    // Floating 7d telemetry for badge
    const badgeTelemetry = useCompletedDaysTelemetry('7d');

    const handleSaveWatch = () => {
        const val = Number(smartwatchInput.trim());
        if (val && val > 0) {
            if (timeframeMode === '7d') setSmartwatchWeeklyBurn(val);
            else setSmartwatchMonthlyBurn(val);
        } else {
            if (timeframeMode === '7d') setSmartwatchWeeklyBurn(null);
            else setSmartwatchMonthlyBurn(null);
        }
    };

    const handleResetWatch = () => {
        if (timeframeMode === '7d') setSmartwatchWeeklyBurn(null);
        else setSmartwatchMonthlyBurn(null);
        setSmartwatchInput('');
    };

    const dailyAvgIntake = telemetry ? Math.round(consumedKcal / daysCount) : 0;
    const dailyAvgBurn = telemetry ? Math.round(telemetry.totalWeeklyBurn / daysCount) : 0;

    return (
        <>
            {/* Pulsing Interactive Button in Food Dock */}
            <button
                onClick={() => {
                    const activeVal = timeframeMode === '7d' ? smartwatchWeeklyBurn : smartwatchMonthlyBurn;
                    setSmartwatchInput(activeVal ? activeVal.toString() : '');
                    setIsOpen(true);
                }}
                className="group relative flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 hover:bg-black/10 border border-black/10 transition-all duration-300 active:scale-95 text-brutal-black hover:border-amber-400/50 shadow-sm shrink-0"
                title="Tap to view Weekly & Monthly Fat Burn Telemetry"
            >
                {/* Pulsing radar dot */}
                <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
                <Flame size={14} className="text-orange-500 group-hover:scale-110 transition-transform shrink-0" />
                <span className="font-data font-bold tracking-tight text-xs text-brutal-black">
                    {badgeTelemetry.telemetry?.isDeficit ? `-${badgeTelemetry.telemetry.fatGrams}g` : `+${badgeTelemetry.telemetry?.fatGrams || 0}g`}
                </span>
                <span className="font-sans text-[8px] font-bold uppercase tracking-wider text-brutal-black/50">
                    fat
                </span>
            </button>

            {/* Expansive Responsive Modal / Mobile Bottom Sheet with Backdrop Click */}
            {isOpen && telemetry && (
                <div
                    onClick={() => setIsOpen(false)}
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full sm:max-w-lg bg-off-white text-brutal-black border-t-2 sm:border-2 border-brutal-black rounded-t-[32px] sm:rounded-3xl p-6 sm:p-8 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 relative max-h-[92vh] overflow-y-auto"
                    >
                        {/* Mobile Grab Handle */}
                        <div className="sm:hidden w-12 h-1.5 bg-black/20 rounded-full mx-auto mb-4" />

                        {/* Close Button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 hover:bg-black/5 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>

                        {/* Modal Header & Timeframe Selector */}
                        <div className="flex flex-col gap-2 mb-5">
                            <div className="flex items-center gap-2.5">
                                <span className="p-2 bg-brutal-black text-amber-400 rounded-xl shadow-sm">
                                    <Flame size={20} />
                                </span>
                                <div>
                                    <h3 className="font-drama text-2xl sm:text-3xl font-bold tracking-tight text-brutal-black">
                                        Energy & Fat Deficit
                                    </h3>
                                    <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-brutal-black/50">
                                        {dateRangeLabel}
                                    </span>
                                </div>
                            </div>

                            {/* 7 Days / 30 Days Switcher inside popup */}
                            <div className="flex items-center gap-1 p-1 bg-black/5 rounded-full w-fit mt-2">
                                <button
                                    onClick={() => {
                                        setTimeframeMode('7d');
                                        setSmartwatchInput(smartwatchWeeklyBurn ? smartwatchWeeklyBurn.toString() : '');
                                    }}
                                    className={`px-4 py-1.5 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all ${
                                        timeframeMode === '7d' ? 'bg-brutal-black text-off-white shadow-sm' : 'text-brutal-black/50 hover:text-brutal-black'
                                    }`}
                                >
                                    7 Days (Week)
                                </button>
                                <button
                                    onClick={() => {
                                        setTimeframeMode('30d');
                                        setSmartwatchInput(smartwatchMonthlyBurn ? smartwatchMonthlyBurn.toString() : '');
                                    }}
                                    className={`px-4 py-1.5 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all ${
                                        timeframeMode === '30d' ? 'bg-brutal-black text-off-white shadow-sm' : 'text-brutal-black/50 hover:text-brutal-black'
                                    }`}
                                >
                                    30 Days (Month)
                                </button>
                            </div>
                        </div>

                        {/* Hero Metric: Fat Burned / Surplus */}
                        <div className={`rounded-3xl p-6 border-2 border-brutal-black/10 my-4 transition-all ${
                            telemetry.isDeficit
                                ? 'bg-emerald-500/10 text-emerald-950'
                                : 'bg-amber-500/10 text-amber-950'
                        }`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <span className="font-sans text-[11px] font-bold uppercase tracking-widest opacity-60 block mb-1.5">
                                        {telemetry.isDeficit ? 'Estimated Pure Body Fat Burned' : 'Caloric Energy Surplus'}
                                    </span>
                                    <div className="flex items-baseline gap-2 whitespace-nowrap">
                                        <span className="font-drama text-6xl sm:text-7xl font-bold tracking-tight">
                                            {telemetry.fatGrams}g
                                        </span>
                                        <span className="font-sans text-sm font-bold uppercase opacity-70">
                                            {telemetry.isDeficit ? 'fat lost' : 'surplus'}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <span className="font-sans text-[11px] font-bold uppercase tracking-widest opacity-60 block mb-1.5">
                                        Net Deficit
                                    </span>
                                    <div className={`inline-flex items-center gap-1.5 font-data text-xl font-bold px-3 py-1.5 rounded-xl border ${
                                        telemetry.isDeficit
                                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800'
                                            : 'bg-amber-500/15 border-amber-500/30 text-amber-800'
                                    }`}>
                                        {telemetry.isDeficit ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                                        {telemetry.isDeficit ? `-${telemetry.netDeficitKcal.toLocaleString()}` : `+${Math.abs(telemetry.netDeficitKcal).toLocaleString()}`} kcal
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-xs font-sans opacity-70">
                                <span>
                                    Baseline: <strong>7,700 kcal = 1 kg pure body fat</strong>
                                </span>
                                {telemetry.isSmartwatchOverride && (
                                    <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                                        <Watch size={12} /> Smartwatch Active
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 2-Column Energy Breakdown */}
                        <div className="grid grid-cols-2 gap-4 mb-5">
                            <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-brutal-black/10 shadow-sm">
                                <span className="font-sans text-[10px] font-bold uppercase tracking-wider opacity-50 block mb-1">
                                    Food Consumed ({daysCount}d)
                                </span>
                                <div className="font-data text-2xl font-bold text-brutal-black">
                                    {consumedKcal.toLocaleString()} <span className="text-xs font-normal opacity-60">kcal</span>
                                </div>
                                <span className="font-sans text-xs opacity-60 mt-0.5 block">
                                    Avg {dailyAvgIntake.toLocaleString()} kcal / day
                                </span>
                            </div>

                            <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-brutal-black/10 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="font-sans text-[10px] font-bold uppercase tracking-wider opacity-50 block mb-1">
                                        Total Burn ({daysCount}d)
                                    </span>
                                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                                        {telemetry.isSmartwatchOverride ? 'Watch' : 'Model'}
                                    </span>
                                </div>
                                <div className="font-data text-2xl font-bold text-brutal-black">
                                    {telemetry.totalWeeklyBurn.toLocaleString()} <span className="text-xs font-normal opacity-60">kcal</span>
                                </div>
                                <span className="font-sans text-xs opacity-60 mt-0.5 block">
                                    Avg {dailyAvgBurn.toLocaleString()} kcal / day {exerciseDaysCount > 0 && `(${exerciseDaysCount}x gym)`}
                                </span>
                            </div>
                        </div>

                        {/* Smartwatch Refinement */}
                        <div className="p-5 bg-indigo-50/70 rounded-2xl border border-indigo-100 mb-5">
                            <div className="flex items-center gap-2 mb-1.5 text-indigo-900 font-bold font-sans text-xs">
                                <Watch size={15} className="text-indigo-600" />
                                <span>Refine {timeframeMode === '7d' ? '7-Day' : '30-Day'} Burn with Smartwatch</span>
                            </div>
                            <div className="relative mb-3">
                                <input
                                    type="number"
                                    placeholder={telemetry.weeklyMaintenanceTDEE.toString()}
                                    value={smartwatchInput}
                                    onChange={(e) => setSmartwatchInput(e.target.value)}
                                    className="w-full bg-white border-2 border-indigo-200 rounded-xl px-4 py-2.5 font-data text-lg font-bold text-brutal-black focus:outline-none focus:border-indigo-600"
                                />
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-sans text-xs font-bold text-indigo-900/40">
                                    kcal
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveWatch}
                                    className="flex-1 py-2.5 bg-indigo-600 text-white font-sans text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
                                >
                                    <Sparkles size={13} className="text-amber-300" />
                                    Save Watch Burn
                                </button>
                                {currentWatchBurn !== null && (
                                    <button
                                        onClick={handleResetWatch}
                                        className="px-4 py-2.5 bg-white text-indigo-950 font-sans text-xs font-bold uppercase tracking-wider rounded-xl border border-indigo-200 hover:bg-indigo-50 active:scale-95 transition-all flex items-center gap-1"
                                    >
                                        <RotateCcw size={12} />
                                        Reset
                                    </button>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full py-3.5 bg-brutal-black text-off-white font-sans text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-brutal-black/90 active:scale-95 transition-all shadow-md"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default WeeklyFatBurnTrigger;
