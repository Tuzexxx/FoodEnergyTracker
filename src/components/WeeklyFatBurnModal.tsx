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
    } = useStore();

    return useMemo(() => {
        const sliceCount = period === '7d' ? 7 : 30;
        // Last completed days strictly up to yesterday (excluding today)
        const completedDays = (historicalDays || []).slice(0, sliceCount);
        const daysCount = Math.max(1, completedDays.length);

        let sumKcal = 0;
        let gymCount = 0;

        completedDays.forEach(day => {
            sumKcal += (day.kcal || 0);
            if (day.realDateStr && historicalExerciseDays?.includes(day.realDateStr)) {
                gymCount += 1;
            }
        });

        // Date range label from oldest completed day to yesterday
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        let dateRangeLabel = 'Last ' + daysCount + ' completed days';
        if (completedDays.length > 0) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const oldestDate = new Date();
            oldestDate.setDate(oldestDate.getDate() - daysCount);
            dateRangeLabel = `${months[oldestDate.getMonth()]} ${oldestDate.getDate()} - ${months[yesterday.getMonth()]} ${yesterday.getDate()}`;
        }

        const telemetry = profile ? calculateWeeklyDeficitTelemetry({
            weight: profile.weight,
            height: profile.height,
            age: profile.age,
            gender: profile.gender,
            activityLevel: profile.activityLevel || 'LIGHT',
            weeklyConsumedKcal: sumKcal,
            exerciseDaysCount: gymCount,
            smartwatchBurnKcal: period === '7d' ? smartwatchWeeklyBurn : null,
        }) : null;

        return {
            daysCount,
            consumedKcal: sumKcal,
            exerciseDaysCount: gymCount,
            dateRangeLabel,
            telemetry
        };
    }, [profile, historicalDays, historicalExerciseDays, smartwatchWeeklyBurn, period]);
}

/** Floating badge and simplified telemetry popup modal */
export const WeeklyFatBurnModal = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [timeframeMode, setTimeframeMode] = useState<'7d' | '30d'>('7d');
    const { consumedKcal, exerciseDaysCount, dateRangeLabel, telemetry } = useCompletedDaysTelemetry(timeframeMode);
    const { smartwatchWeeklyBurn, setSmartwatchWeeklyBurn } = useStore();
    const [smartwatchInput, setSmartwatchInput] = useState(smartwatchWeeklyBurn ? smartwatchWeeklyBurn.toString() : '');

    // Floating 7d telemetry for badge
    const badgeTelemetry = useCompletedDaysTelemetry('7d');

    const handleSaveWatch = () => {
        const val = Number(smartwatchInput.trim());
        if (val && val > 0) {
            setSmartwatchWeeklyBurn(val);
        } else {
            setSmartwatchWeeklyBurn(null);
        }
    };

    const handleResetWatch = () => {
        setSmartwatchWeeklyBurn(null);
        setSmartwatchInput('');
    };

    const dailyAvgIntake = telemetry ? Math.round(consumedKcal / (timeframeMode === '7d' ? 7 : 30)) : 0;
    const dailyAvgBurn = telemetry ? Math.round(telemetry.totalWeeklyBurn / (timeframeMode === '7d' ? 7 : 30)) : 0;

    return (
        <>
            {/* High-visibility Floating Button (Visible on both Mobile and Desktop) */}
            <aside aria-label="Fat burn telemetry" className="fixed bottom-24 right-4 sm:right-6 z-50 pointer-events-auto">
                <button
                    onClick={() => {
                        setSmartwatchInput(smartwatchWeeklyBurn ? smartwatchWeeklyBurn.toString() : '');
                        setIsOpen(true);
                    }}
                    className="group flex items-center gap-2 px-3.5 py-2.5 rounded-full border-2 border-brutal-black shadow-2xl backdrop-blur-xl transition-all duration-300 active:scale-95 bg-gradient-to-r from-amber-400 to-orange-500 text-brutal-black hover:shadow-amber-500/30"
                    title="Energy & Fat Deficit Telemetry"
                >
                    <div className="relative flex items-center justify-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping absolute" />
                        <span className="p-1 bg-black text-amber-400 rounded-full group-hover:scale-110 transition-transform">
                            <Flame size={14} className="animate-bounce" />
                        </span>
                    </div>

                    <div className="flex flex-col items-start pr-1">
                        <div className="flex items-center gap-1">
                            <span className="font-data text-xs font-black tracking-tight leading-none">
                                {badgeTelemetry.telemetry?.isDeficit ? `-${badgeTelemetry.telemetry.fatGrams}g` : `+${badgeTelemetry.telemetry?.fatGrams || 0}g`}
                            </span>
                            <span className="font-sans text-[8px] font-bold uppercase tracking-wider opacity-80 leading-none">
                                {badgeTelemetry.telemetry?.isDeficit ? 'fat burned' : 'surplus'}
                            </span>
                        </div>
                        <span className="font-sans text-[7px] uppercase font-bold tracking-widest opacity-60 leading-none mt-0.5">
                            7d Recap
                        </span>
                    </div>
                </button>
            </aside>

            {/* Simplified Telemetry Popup Modal */}
            {isOpen && telemetry && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-off-white text-brutal-black border-2 border-brutal-black w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative max-h-[90vh] overflow-y-auto">
                        {/* Close Button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full transition-colors"
                        >
                            <X size={18} />
                        </button>

                        {/* Modal Header & Timeframe Selector */}
                        <div className="flex flex-col gap-2 mb-4">
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 bg-brutal-black text-amber-400 rounded-lg shadow-sm">
                                    <Flame size={18} />
                                </span>
                                <div>
                                    <h3 className="font-drama text-2xl font-bold tracking-tight text-brutal-black">
                                        Energy & Fat Deficit
                                    </h3>
                                    <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-brutal-black/50">
                                        {dateRangeLabel}
                                    </span>
                                </div>
                            </div>

                            {/* 7 Days / 30 Days Switcher inside popup */}
                            <div className="flex items-center gap-1 p-1 bg-black/5 rounded-full w-fit mt-1">
                                <button
                                    onClick={() => setTimeframeMode('7d')}
                                    className={`px-3 py-1 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all ${
                                        timeframeMode === '7d' ? 'bg-brutal-black text-off-white shadow-sm' : 'text-brutal-black/50 hover:text-brutal-black'
                                    }`}
                                >
                                    7 Days (Week)
                                </button>
                                <button
                                    onClick={() => setTimeframeMode('30d')}
                                    className={`px-3 py-1 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all ${
                                        timeframeMode === '30d' ? 'bg-brutal-black text-off-white shadow-sm' : 'text-brutal-black/50 hover:text-brutal-black'
                                    }`}
                                >
                                    30 Days (Month)
                                </button>
                            </div>
                        </div>

                        {/* Hero Metric: Fat Burned / Surplus */}
                        <div className={`rounded-2xl p-5 border my-3 transition-all ${
                            telemetry.isDeficit
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-950'
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-950'
                        }`}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <span className="font-sans text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">
                                        {telemetry.isDeficit ? 'Estimated Pure Body Fat Burned' : 'Caloric Energy Surplus'}
                                    </span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-drama text-5xl font-bold tracking-tight">
                                            {telemetry.fatGrams} g
                                        </span>
                                        <span className="font-sans text-xs font-bold uppercase opacity-70">
                                            {telemetry.isDeficit ? 'body fat lost' : 'stored energy'}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className="font-sans text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">
                                        Net Deficit
                                    </span>
                                    <div className={`inline-flex items-center gap-1 font-data text-lg font-bold px-2.5 py-1 rounded-xl border ${
                                        telemetry.isDeficit
                                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800'
                                            : 'bg-amber-500/15 border-amber-500/30 text-amber-800'
                                    }`}>
                                        {telemetry.isDeficit ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                                        {telemetry.isDeficit ? `-${telemetry.netDeficitKcal.toLocaleString()}` : `+${Math.abs(telemetry.netDeficitKcal).toLocaleString()}`} kcal
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between text-[11px] font-sans opacity-70">
                                <span>
                                    Baseline: <strong>7,700 kcal = 1 kg pure body fat</strong>
                                </span>
                                {telemetry.isSmartwatchOverride && timeframeMode === '7d' && (
                                    <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                        <Watch size={10} /> Smartwatch Active
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 2-Column Energy Breakdown */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-brutal-black/10">
                                <span className="font-sans text-[9px] font-bold uppercase tracking-wider opacity-50 block mb-0.5">
                                    Food Consumed
                                </span>
                                <div className="font-data text-lg font-bold text-brutal-black">
                                    {consumedKcal.toLocaleString()} <span className="text-xs font-normal opacity-60">kcal</span>
                                </div>
                                <span className="font-sans text-[10px] opacity-60">
                                    Avg {dailyAvgIntake.toLocaleString()} kcal / day
                                </span>
                            </div>

                            <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-brutal-black/10">
                                <div className="flex items-center justify-between">
                                    <span className="font-sans text-[9px] font-bold uppercase tracking-wider opacity-50 block mb-0.5">
                                        Total Burn
                                    </span>
                                    <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">
                                        {telemetry.isSmartwatchOverride && timeframeMode === '7d' ? 'Watch' : 'Model'}
                                    </span>
                                </div>
                                <div className="font-data text-lg font-bold text-brutal-black">
                                    {telemetry.totalWeeklyBurn.toLocaleString()} <span className="text-xs font-normal opacity-60">kcal</span>
                                </div>
                                <span className="font-sans text-[10px] opacity-60">
                                    Avg {dailyAvgBurn.toLocaleString()} kcal / day {exerciseDaysCount > 0 && `(${exerciseDaysCount}x gym)`}
                                </span>
                            </div>
                        </div>

                        {/* Smartwatch Refinement (7-Day mode) */}
                        {timeframeMode === '7d' && (
                            <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 mb-4">
                                <div className="flex items-center gap-1.5 mb-1 text-indigo-900 font-bold font-sans text-xs">
                                    <Watch size={13} className="text-indigo-600" />
                                    <span>Refine 7-Day Burn with Smartwatch</span>
                                </div>
                                <div className="relative mb-2">
                                    <input
                                        type="number"
                                        placeholder={telemetry.weeklyMaintenanceTDEE.toString()}
                                        value={smartwatchInput}
                                        onChange={(e) => setSmartwatchInput(e.target.value)}
                                        className="w-full bg-white border-2 border-indigo-200 rounded-xl px-3.5 py-2 font-data text-base font-bold text-brutal-black focus:outline-none focus:border-indigo-600"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 font-sans text-xs font-bold text-indigo-900/40">
                                        kcal
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSaveWatch}
                                        className="flex-1 py-2 bg-indigo-600 text-white font-sans text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1"
                                    >
                                        <Sparkles size={12} className="text-amber-300" />
                                        Save Watch Burn
                                    </button>
                                    {smartwatchWeeklyBurn !== null && (
                                        <button
                                            onClick={handleResetWatch}
                                            className="px-3 py-2 bg-white text-indigo-950 font-sans text-xs font-bold uppercase tracking-wider rounded-xl border border-indigo-200 hover:bg-indigo-50 active:scale-95 transition-all flex items-center gap-1"
                                        >
                                            <RotateCcw size={11} />
                                            Reset
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full py-3 bg-brutal-black text-off-white font-sans text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-brutal-black/90 active:scale-95 transition-all shadow-md"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default WeeklyFatBurnModal;
