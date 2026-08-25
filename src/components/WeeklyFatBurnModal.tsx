import { useState, useMemo } from 'react';
import { Flame, Watch, Sparkles, X, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { calculateWeeklyDeficitTelemetry } from '../utils/calorieFormula';

interface WeeklyTelemetryData {
    weeklyConsumed: number;
    exerciseDaysCount: number;
    dateRangeLabel: string;
    telemetry: ReturnType<typeof calculateWeeklyDeficitTelemetry> | null;
}

export function useWeeklyTelemetry(): WeeklyTelemetryData {
    const {
        profile,
        consumedKcal,
        historicalDays,
        exerciseDay,
        historicalExerciseDays,
        smartwatchWeeklyBurn,
    } = useStore();

    return useMemo(() => {
        let sumKcal = consumedKcal;
        let gymCount = exerciseDay ? 1 : 0;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        const last6Days = (historicalDays || []).slice(0, 6);
        last6Days.forEach(day => {
            sumKcal += (day.kcal || 0);
            if (day.realDateStr && historicalExerciseDays?.includes(day.realDateStr)) {
                gymCount += 1;
            }
        });

        const startDate = new Date(startOfToday - 6 * 24 * 60 * 60 * 1000);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const formatD = (d: Date) => `${months[d.getMonth()]} ${d.getDate()}`;
        const dateRangeLabel = `${formatD(startDate)} - ${formatD(now)}`;

        const telemetry = profile ? calculateWeeklyDeficitTelemetry({
            weight: profile.weight,
            height: profile.height,
            age: profile.age,
            gender: profile.gender,
            activityLevel: profile.activityLevel || 'LIGHT',
            weeklyConsumedKcal: sumKcal,
            exerciseDaysCount: gymCount,
            smartwatchBurnKcal: smartwatchWeeklyBurn,
        }) : null;

        return {
            weeklyConsumed: sumKcal,
            exerciseDaysCount: gymCount,
            dateRangeLabel,
            telemetry
        };
    }, [profile, consumedKcal, historicalDays, exerciseDay, historicalExerciseDays, smartwatchWeeklyBurn]);
}

/** Standalone full weekly report card (rendered when user selects "Week" tab) */
export const WeeklyFatBurnReport = () => {
    const { weeklyConsumed, exerciseDaysCount, dateRangeLabel, telemetry } = useWeeklyTelemetry();
    const { smartwatchWeeklyBurn, setSmartwatchWeeklyBurn } = useStore();
    const [smartwatchInput, setSmartwatchInput] = useState(smartwatchWeeklyBurn ? smartwatchWeeklyBurn.toString() : '');
    const [isRefining, setIsRefining] = useState(false);

    if (!telemetry) return null;

    const handleSave = () => {
        const val = Number(smartwatchInput.trim());
        if (val && val > 0) {
            setSmartwatchWeeklyBurn(val);
        } else {
            setSmartwatchWeeklyBurn(null);
        }
        setIsRefining(false);
    };

    const handleReset = () => {
        setSmartwatchWeeklyBurn(null);
        setSmartwatchInput('');
        setIsRefining(false);
    };

    const dailyAvgIntake = Math.round(weeklyConsumed / 7);
    const dailyAvgBurn = Math.round(telemetry.totalWeeklyBurn / 7);

    return (
        <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-drama text-2xl font-bold tracking-tight text-brutal-black">
                        Weekly Energy & Fat Deficit
                    </h2>
                    <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-brutal-black/50">
                        {dateRangeLabel} (7-Day Rolling Summary)
                    </span>
                </div>

                <button
                    onClick={() => {
                        setSmartwatchInput(smartwatchWeeklyBurn ? smartwatchWeeklyBurn.toString() : '');
                        setIsRefining(!isRefining);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 text-white rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-md shadow-indigo-600/20"
                >
                    <Watch size={13} />
                    <span>{isRefining ? 'Close' : 'Refine'}</span>
                </button>
            </div>

            {/* Smartwatch Refinement Inline Drawer */}
            {isRefining && (
                <div className="p-5 bg-indigo-50/80 rounded-3xl border-2 border-indigo-200 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-2 mb-2 text-indigo-900 font-bold font-sans text-xs">
                        <Watch size={16} className="text-indigo-600" />
                        <span>Refine with Smartwatch Active + Resting Burn</span>
                    </div>
                    <p className="font-sans text-xs text-indigo-950/70 mb-4 leading-relaxed">
                        Enter your 7-day total energy expenditure from Apple Watch, Garmin, Whoop, or Galaxy Watch.
                    </p>
                    <div className="relative mb-3">
                        <input
                            type="number"
                            placeholder={telemetry.weeklyMaintenanceTDEE.toString()}
                            value={smartwatchInput}
                            onChange={(e) => setSmartwatchInput(e.target.value)}
                            className="w-full bg-white border-2 border-indigo-300 rounded-2xl px-4 py-3 font-data text-xl font-bold text-brutal-black focus:outline-none focus:border-indigo-600"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-sans text-xs font-bold text-indigo-900/40">
                            kcal
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            className="flex-1 py-3 bg-indigo-600 text-white font-sans text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5"
                        >
                            <Sparkles size={14} className="text-amber-300" />
                            Save Watch Burn
                        </button>
                        {smartwatchWeeklyBurn !== null && (
                            <button
                                onClick={handleReset}
                                className="px-4 py-3 bg-white text-indigo-950 font-sans text-xs font-bold uppercase tracking-wider rounded-xl border border-indigo-200 hover:bg-indigo-50 active:scale-95 transition-all flex items-center gap-1"
                            >
                                <RotateCcw size={12} />
                                Reset
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Core Hero Card: Fat Burn / Loss */}
            <div className={`rounded-3xl p-6 border-2 border-brutal-black shadow-lg transition-all ${
                telemetry.isDeficit
                    ? 'bg-emerald-500/10 text-emerald-950'
                    : 'bg-amber-500/10 text-amber-950'
            }`}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <span className="font-sans text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">
                            {telemetry.isDeficit ? 'Estimated Pure Body Fat Burned' : 'Caloric Energy Surplus'}
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="font-drama text-5xl sm:text-6xl font-bold tracking-tight">
                                {telemetry.fatGrams} g
                            </span>
                            <span className="font-sans text-xs font-bold uppercase opacity-70">
                                {telemetry.isDeficit ? 'body fat lost' : 'stored energy'}
                            </span>
                        </div>
                    </div>

                    <div className="text-right">
                        <span className="font-sans text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">
                            Net Balance
                        </span>
                        <div className={`inline-flex items-center gap-1 font-data text-lg sm:text-xl font-bold px-3 py-1.5 rounded-xl border ${
                            telemetry.isDeficit
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800'
                                : 'bg-amber-500/15 border-amber-500/30 text-amber-800'
                        }`}>
                            {telemetry.isDeficit ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                            {telemetry.isDeficit ? `-${telemetry.netDeficitKcal.toLocaleString()}` : `+${Math.abs(telemetry.netDeficitKcal).toLocaleString()}`} kcal
                        </div>
                    </div>
                </div>

                <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-[11px] font-sans opacity-70">
                    <span>
                        Metabolic baseline: <strong>7,700 kcal = 1 kg pure body fat</strong>
                    </span>
                    {telemetry.isSmartwatchOverride && (
                        <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                            <Watch size={11} /> Smartwatch Active
                        </span>
                    )}
                </div>
            </div>

            {/* 2-Column Energy Breakdown */}
            <div className="grid grid-cols-2 gap-4">
                <div className="brutal-card p-4 bg-white/80 border-2 border-brutal-black">
                    <span className="font-sans text-[9px] font-bold uppercase tracking-wider opacity-50 block mb-0.5">
                        7-Day Food Intake
                    </span>
                    <div className="font-data text-2xl font-bold text-brutal-black">
                        {weeklyConsumed.toLocaleString()} <span className="text-xs font-normal opacity-60">kcal</span>
                    </div>
                    <span className="font-sans text-[11px] opacity-60">
                        Avg {dailyAvgIntake.toLocaleString()} kcal / day
                    </span>
                </div>

                <div className="brutal-card p-4 bg-white/80 border-2 border-brutal-black">
                    <div className="flex items-center justify-between">
                        <span className="font-sans text-[9px] font-bold uppercase tracking-wider opacity-50 block mb-0.5">
                            7-Day Total Burn
                        </span>
                        <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">
                            {telemetry.isSmartwatchOverride ? 'Watch' : 'Model'}
                        </span>
                    </div>
                    <div className="font-data text-2xl font-bold text-brutal-black">
                        {telemetry.totalWeeklyBurn.toLocaleString()} <span className="text-xs font-normal opacity-60">kcal</span>
                    </div>
                    <span className="font-sans text-[11px] opacity-60">
                        Avg {dailyAvgBurn.toLocaleString()} kcal / day {exerciseDaysCount > 0 && `(${exerciseDaysCount}x gym)`}
                    </span>
                </div>
            </div>
        </div>
    );
};

/** Floating badge modal version (visible on bottom-left) */
export const WeeklyFatBurnModal = () => {
    const { dateRangeLabel, telemetry } = useWeeklyTelemetry();
    const { smartwatchWeeklyBurn, setSmartwatchWeeklyBurn } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    const [smartwatchInput, setSmartwatchInput] = useState(smartwatchWeeklyBurn ? smartwatchWeeklyBurn.toString() : '');

    if (!telemetry) return null;

    const handleSave = () => {
        const val = Number(smartwatchInput.trim());
        if (val && val > 0) {
            setSmartwatchWeeklyBurn(val);
        } else {
            setSmartwatchWeeklyBurn(null);
        }
        setIsOpen(false);
    };

    const handleReset = () => {
        setSmartwatchWeeklyBurn(null);
        setSmartwatchInput('');
        setIsOpen(false);
    };

    return (
        <>
            {/* Floating Jiggling Fat Burn Badge (Bottom Left) */}
            <aside aria-label="Weekly fat burn telemetry" className="fixed bottom-24 left-4 z-40">
                <button
                    onClick={() => {
                        setSmartwatchInput(smartwatchWeeklyBurn ? smartwatchWeeklyBurn.toString() : '');
                        setIsOpen(true);
                    }}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-full border-2 border-brutal-black shadow-2xl backdrop-blur-xl transition-all duration-300 active:scale-95 ${
                        telemetry.isDeficit
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-brutal-black hover:shadow-amber-500/30'
                            : 'bg-gradient-to-r from-amber-200 to-amber-400 text-brutal-black'
                    }`}
                    title="Weekly Fat Burn & Deficit Telemetry"
                >
                    <div className="relative flex items-center justify-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping absolute" />
                        <span className="p-1 bg-black text-amber-400 rounded-full group-hover:scale-110 group-hover:rotate-12 transition-transform">
                            <Flame size={14} className="animate-bounce" />
                        </span>
                    </div>

                    <div className="flex flex-col items-start pr-1">
                        <div className="flex items-center gap-1">
                            <span className="font-data text-xs font-black tracking-tight leading-none">
                                {telemetry.isDeficit ? `-${telemetry.fatGrams}g` : `+${telemetry.fatGrams}g`}
                            </span>
                            <span className="font-sans text-[8px] font-bold uppercase tracking-wider opacity-75 leading-none">
                                {telemetry.isDeficit ? 'fat burned' : 'surplus'}
                            </span>
                        </div>
                        <span className="font-sans text-[7px] uppercase font-bold tracking-widest opacity-60 leading-none mt-0.5">
                            7d Recap
                        </span>
                    </div>
                </button>
            </aside>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-off-white text-brutal-black border-2 border-brutal-black w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full transition-colors"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-2.5 mb-1">
                            <span className="p-1.5 bg-brutal-black text-amber-400 rounded-lg shadow-sm">
                                <Flame size={18} />
                            </span>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-drama text-2xl font-bold tracking-tight text-brutal-black">
                                        Weekly Fat Burn Telemetry
                                    </h3>
                                    <span className="text-[9px] font-sans font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                                        Lab
                                    </span>
                                </div>
                                <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-brutal-black/50">
                                    {dateRangeLabel} (7 Days)
                                </span>
                            </div>
                        </div>

                        {/* Core Hero Metric: Fat Burn / Loss */}
                        <div className={`rounded-2xl p-4 sm:p-5 border my-4 transition-all ${
                            telemetry.isDeficit
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-950'
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-950'
                        }`}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <span className="font-sans text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">
                                        {telemetry.isDeficit ? 'Estimated Pure Fat Burned' : 'Caloric Energy Surplus'}
                                    </span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-drama text-4xl sm:text-5xl font-bold tracking-tight">
                                            {telemetry.fatGrams} g
                                        </span>
                                        <span className="font-sans text-xs font-bold uppercase opacity-70">
                                            {telemetry.isDeficit ? 'body fat lost' : 'stored energy'}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <span className="font-sans text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">
                                        Net Balance
                                    </span>
                                    <div className={`inline-flex items-center gap-1 font-data text-base sm:text-lg font-bold px-2.5 py-1 rounded-xl border ${
                                        telemetry.isDeficit
                                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800'
                                            : 'bg-amber-500/15 border-amber-500/30 text-amber-800'
                                    }`}>
                                        {telemetry.isDeficit ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                                        {telemetry.isDeficit ? `-${telemetry.netDeficitKcal.toLocaleString()}` : `+${Math.abs(telemetry.netDeficitKcal).toLocaleString()}`} kcal
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between text-[11px] font-sans opacity-70">
                                <span>
                                    Metabolic standard: <strong>7,700 kcal = 1 kg pure body fat</strong>
                                </span>
                                {telemetry.isSmartwatchOverride && (
                                    <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                        <Watch size={10} /> Smartwatch Data
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Smartwatch Refinement Section */}
                        <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 mb-5">
                            <div className="flex items-center gap-2 mb-1.5 text-indigo-900 font-bold font-sans text-xs">
                                <Watch size={14} className="text-indigo-600" />
                                <span>Refine with Smartwatch Burn</span>
                            </div>
                            <div className="relative mb-2">
                                <input
                                    type="number"
                                    placeholder={telemetry.weeklyMaintenanceTDEE.toString()}
                                    value={smartwatchInput}
                                    onChange={(e) => setSmartwatchInput(e.target.value)}
                                    className="w-full bg-white border-2 border-indigo-200 rounded-xl px-3.5 py-2.5 font-data text-lg font-bold text-brutal-black focus:outline-none focus:border-indigo-600"
                                />
                                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-sans text-xs font-bold text-indigo-900/40">
                                    kcal
                                </span>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={handleSave}
                                    className="w-full py-3 bg-indigo-600 text-white font-sans text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5"
                                >
                                    <Sparkles size={13} className="text-amber-300" />
                                    Save Smartwatch Burn
                                </button>
                                {smartwatchWeeklyBurn !== null && (
                                    <button
                                        onClick={handleReset}
                                        className="w-full py-2 bg-transparent hover:bg-indigo-100/50 text-indigo-900 font-sans text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 opacity-70 hover:opacity-100"
                                    >
                                        <RotateCcw size={11} />
                                        Revert to Profile Model
                                    </button>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={() => setIsOpen(false)}
                            className="w-full py-3.5 bg-brutal-black text-off-white font-sans text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-brutal-black/90 active:scale-95 transition-all shadow-md"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default WeeklyFatBurnModal;
