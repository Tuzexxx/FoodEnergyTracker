import { useState, useMemo } from 'react';
import { Flame, Watch, Sparkles, ChevronRight, X, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { calculateWeeklyDeficitTelemetry } from '../utils/calorieFormula';

export const WeeklyDeficitCard = () => {
    const {
        profile,
        consumedKcal,
        historicalDays,
        exerciseDay,
        historicalExerciseDays,
        smartwatchWeeklyBurn,
        setSmartwatchWeeklyBurn,
    } = useStore();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [smartwatchInput, setSmartwatchInput] = useState(smartwatchWeeklyBurn ? smartwatchWeeklyBurn.toString() : '');

    // Aggregate 7-day intake and exercise days
    const { weeklyConsumed, exerciseDaysCount, dateRangeLabel } = useMemo(() => {
        // Today's consumed
        let sumKcal = consumedKcal;
        let gymCount = exerciseDay ? 1 : 0;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        // Previous 6 days
        const last6Days = (historicalDays || []).slice(0, 6);
        last6Days.forEach(day => {
            sumKcal += (day.kcal || 0);
            if (day.realDateStr && historicalExerciseDays?.includes(day.realDateStr)) {
                gymCount += 1;
            }
        });

        // Date range label
        const startDate = new Date(startOfToday - 6 * 24 * 60 * 60 * 1000);
        const formatD = (d: Date) => `${d.getDate()}. ${d.getMonth() + 1}.`;
        const dateRangeLabel = `${formatD(startDate)} – ${formatD(now)}`;

        return {
            weeklyConsumed: sumKcal,
            exerciseDaysCount: gymCount,
            dateRangeLabel
        };
    }, [consumedKcal, historicalDays, exerciseDay, historicalExerciseDays]);

    // Calculate telemetry metrics
    const telemetry = useMemo(() => {
        if (!profile) return null;

        return calculateWeeklyDeficitTelemetry({
            weight: profile.weight,
            height: profile.height,
            age: profile.age,
            gender: profile.gender,
            activityLevel: profile.activityLevel || 'LIGHT',
            weeklyConsumedKcal: weeklyConsumed,
            exerciseDaysCount,
            smartwatchBurnKcal: smartwatchWeeklyBurn,
        });
    }, [profile, weeklyConsumed, exerciseDaysCount, smartwatchWeeklyBurn]);

    if (!profile || !telemetry) return null;

    const handleSaveSmartwatch = () => {
        const val = Number(smartwatchInput.trim());
        if (val && val > 0) {
            setSmartwatchWeeklyBurn(val);
        } else {
            setSmartwatchWeeklyBurn(null);
        }
        setIsModalOpen(false);
    };

    const handleResetToModel = () => {
        setSmartwatchWeeklyBurn(null);
        setSmartwatchInput('');
        setIsModalOpen(false);
    };

    const dailyAvgIntake = Math.round(weeklyConsumed / 7);
    const dailyAvgBurn = Math.round(telemetry.totalWeeklyBurn / 7);

    return (
        <section aria-label="Týdenní energetická bilance" className="w-full brutal-card p-5 sm:p-6 bg-gradient-to-br from-white via-off-white to-amber-50/40 relative overflow-hidden border-2 border-brutal-black shadow-lg">
            {/* Background Accent Glow */}
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-brutal-black text-amber-400 rounded-lg shadow-sm">
                        <Flame size={16} className="animate-pulse" />
                    </span>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="font-drama text-lg font-bold tracking-tight text-brutal-black">
                                Týdenní Bilance & Tuk
                            </h2>
                            <span className="text-[9px] font-sans font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
                                Lab
                            </span>
                        </div>
                        <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-brutal-black/50">
                            {dateRangeLabel} (7 dní)
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => {
                        setSmartwatchInput(smartwatchWeeklyBurn ? smartwatchWeeklyBurn.toString() : '');
                        setIsModalOpen(true);
                    }}
                    className="group inline-flex items-center gap-1.5 px-3 py-1.5 bg-brutal-black/5 hover:bg-brutal-black hover:text-off-white text-brutal-black rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all active:scale-95 border border-brutal-black/10"
                    title="Upresnit výdej kalorií z chytrých hodinek"
                >
                    <Watch size={13} />
                    <span>Upresnit</span>
                    <ChevronRight size={13} className="opacity-50 group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>

            {/* Core Hero Metric: Fat Burn / Gain */}
            <div className={`rounded-2xl p-4 sm:p-5 border mb-4 transition-all ${
                telemetry.isDeficit
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-950'
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-950'
            }`}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <span className="font-sans text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">
                            {telemetry.isDeficit ? '?? Odhadovaný úbytek tuku' : '? Energetický prebytek'}
                        </span>
                        <div className="flex items-baseline gap-2">
                            <span className="font-drama text-4xl sm:text-5xl font-bold tracking-tight">
                                {telemetry.fatGrams} g
                            </span>
                            <span className="font-sans text-xs font-bold uppercase opacity-70">
                                {telemetry.isDeficit ? 'cistého tuku spáleno' : 'možného tuku'}
                            </span>
                        </div>
                    </div>

                    <div className="text-right">
                        <span className="font-sans text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1">
                            Cistý deficit / prebytek
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
                        Metabolický prepocet: <strong>7 700 kcal ˜ 1 kg telesného tuku</strong>
                    </span>
                    {telemetry.isSmartwatchOverride && (
                        <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                            <Watch size={10} /> Data z hodinek
                        </span>
                    )}
                </div>
            </div>

            {/* 2-Column Energy Breakdown */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-brutal-black/10">
                    <span className="font-sans text-[9px] font-bold uppercase tracking-wider opacity-50 block mb-0.5">
                        Týdenní príjem (Jídlo)
                    </span>
                    <div className="font-data text-lg font-bold text-brutal-black">
                        {weeklyConsumed.toLocaleString()} <span className="text-xs font-normal opacity-60">kcal</span>
                    </div>
                    <span className="font-sans text-[10px] opacity-60">
                        Ø {dailyAvgIntake.toLocaleString()} kcal / den
                    </span>
                </div>

                <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-xl border border-brutal-black/10">
                    <div className="flex items-center justify-between">
                        <span className="font-sans text-[9px] font-bold uppercase tracking-wider opacity-50 block mb-0.5">
                            Týdenní výdej
                        </span>
                        {telemetry.isSmartwatchOverride ? (
                            <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-wider">Hodinky</span>
                        ) : (
                            <span className="text-[9px] font-bold text-brutal-black/40 uppercase tracking-wider">Model</span>
                        )}
                    </div>
                    <div className="font-data text-lg font-bold text-brutal-black">
                        {telemetry.totalWeeklyBurn.toLocaleString()} <span className="text-xs font-normal opacity-60">kcal</span>
                    </div>
                    <span className="font-sans text-[10px] opacity-60">
                        Ø {dailyAvgBurn.toLocaleString()} kcal / den {exerciseDaysCount > 0 && `(${exerciseDaysCount}× gym)`}
                    </span>
                </div>
            </div>

            {/* Smartwatch Refinement Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-off-white text-brutal-black border-2 border-brutal-black w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative">
                        <button
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-black/5 rounded-full transition-colors"
                        >
                            <X size={18} />
                        </button>

                        <div className="flex items-center gap-2 mb-2 text-indigo-600">
                            <Watch size={22} />
                            <h3 className="font-drama text-2xl font-bold tracking-tight text-brutal-black">
                                Upresnit výdej
                            </h3>
                        </div>

                        <p className="font-sans text-xs leading-relaxed opacity-70 mb-5">
                            Zadejte celkový týdenní energetický výdej (BMR + aktivní spálené kalorie) namerený vašimi chytrými hodinkami (Garmin, Apple Watch, Galaxy Watch, Whoop).
                        </p>

                        <div className="mb-5">
                            <label className="font-sans text-[10px] font-bold uppercase tracking-widest opacity-60 block mb-1.5">
                                Celkový výdej za 7 dní (kcal)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder={telemetry.weeklyMaintenanceTDEE.toString()}
                                    value={smartwatchInput}
                                    onChange={(e) => setSmartwatchInput(e.target.value)}
                                    className="w-full bg-white border-2 border-brutal-black rounded-2xl px-4 py-3.5 font-data text-xl font-bold text-brutal-black focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    autoFocus
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-sans text-xs font-bold opacity-40">
                                    kcal
                                </span>
                            </div>
                            <span className="font-sans text-[10px] opacity-50 mt-1 block">
                                Automatický model odhaduje: {telemetry.weeklyMaintenanceTDEE.toLocaleString()} kcal
                            </span>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={handleSaveSmartwatch}
                                className="w-full py-3.5 bg-brutal-black text-off-white font-sans text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-brutal-black/90 active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
                            >
                                <Sparkles size={14} className="text-amber-400" />
                                Uložit hodnotu z hodinek
                            </button>

                            {smartwatchWeeklyBurn !== null && (
                                <button
                                    onClick={handleResetToModel}
                                    className="w-full py-2.5 bg-transparent hover:bg-black/5 text-brutal-black font-sans text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5 opacity-60 hover:opacity-100"
                                >
                                    <RotateCcw size={12} />
                                    Vrátit na výchozí model ({telemetry.weeklyMaintenanceTDEE.toLocaleString()} kcal)
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default WeeklyDeficitCard;
