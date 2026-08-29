import { useState, useMemo } from 'react';
import { Watch, RotateCcw, TrendingDown, TrendingUp, Activity, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useCompletedDaysTelemetry } from './WeeklyFatBurnModal';
import { getTranslation } from '../utils/i18n';

const ProgressView = () => {
    const [period, setPeriod] = useState<'7d' | '30d'>('7d');
    const { daysCount, consumedKcal, exerciseDaysCount, dateRangeLabel, telemetry } = useCompletedDaysTelemetry(period);
    const {
        smartwatchWeeklyBurn,
        setSmartwatchWeeklyBurn,
        smartwatchMonthlyBurn,
        setSmartwatchMonthlyBurn,
        profile,
        targetKcal,
        language
    } = useStore();
    const t = getTranslation(language);

    const currentWatchBurn = period === '7d' ? smartwatchWeeklyBurn : smartwatchMonthlyBurn;
    const [smartwatchInput, setSmartwatchInput] = useState(currentWatchBurn ? currentWatchBurn.toString() : '');

    const handleSaveWatch = () => {
        const val = Number(smartwatchInput.trim());
        if (val && val > 0) {
            if (period === '7d') setSmartwatchWeeklyBurn(val);
            else setSmartwatchMonthlyBurn(val);
        } else {
            if (period === '7d') setSmartwatchWeeklyBurn(null);
            else setSmartwatchMonthlyBurn(null);
        }
    };

    const handleResetWatch = () => {
        if (period === '7d') setSmartwatchWeeklyBurn(null);
        else setSmartwatchMonthlyBurn(null);
        setSmartwatchInput('');
    };

    const dailyAvgIntake = telemetry ? Math.round(consumedKcal / daysCount) : 0;
    const dailyAvgBurn = telemetry ? Math.round(telemetry.totalWeeklyBurn / daysCount) : 0;

    // Sugar cubes equivalent calculation (1 standard cube ≈ 4g)
    const sugarCubesCount = useMemo(() => {
        if (!telemetry) return 0;
        return Math.max(1, Math.round(telemetry.fatGrams / 4));
    }, [telemetry]);

    // Optimal plan projection calculation
    const { optimalFatGrams, adherenceEfficiency } = useMemo(() => {
        if (!telemetry || !targetKcal || targetKcal === 0) {
            return { optimalFatGrams: 0, adherenceEfficiency: 100 };
        }
        const expectedDailyDeficit = Math.max(0, Math.round(dailyAvgBurn - targetKcal));
        const optimalDeficitKcal = expectedDailyDeficit * daysCount;
        const optGrams = Math.max(0, Math.round(optimalDeficitKcal / 7.7));
        const efficiency = optGrams > 0
            ? Math.min(150, Math.round((telemetry.fatGrams / optGrams) * 100))
            : 100;
        return { optimalFatGrams: optGrams, adherenceEfficiency: efficiency };
    }, [telemetry, targetKcal, dailyAvgBurn, daysCount]);

    if (!telemetry || !profile) {
        return (
            <div className="w-full flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-black/5 shadow-sm">
                <Activity size={32} className="text-orange-500 animate-pulse mb-3" />
                <h3 className="font-drama text-2xl mb-1">{t.progress.calibratingTitle}</h3>
                <p className="font-sans text-xs opacity-50">{t.progress.calibratingDesc}</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Header & Period Switcher */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-drama text-3xl text-brutal-black tracking-tight">{t.progress.title}</h2>
                    <p className="font-sans text-xs text-brutal-black/50 tracking-wide mt-0.5">{dateRangeLabel}</p>
                </div>

                {/* 7d / 30d Toggle */}
                <div className="bg-black/5 p-1 rounded-full border border-black/5 flex items-center gap-1 shadow-inner shrink-0">
                    <button
                        onClick={() => {
                            setPeriod('7d');
                            setSmartwatchInput(smartwatchWeeklyBurn ? smartwatchWeeklyBurn.toString() : '');
                        }}
                        className={`px-3.5 py-1 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all ${period === '7d' ? 'bg-brutal-black text-off-white shadow-sm' : 'text-brutal-black/50 hover:text-brutal-black'}`}
                    >
                        {t.progress.sevenDays}
                    </button>
                    <button
                        onClick={() => {
                            setPeriod('30d');
                            setSmartwatchInput(smartwatchMonthlyBurn ? smartwatchMonthlyBurn.toString() : '');
                        }}
                        className={`px-3.5 py-1 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all ${period === '30d' ? 'bg-brutal-black text-off-white shadow-sm' : 'text-brutal-black/50 hover:text-brutal-black'}`}
                    >
                        {t.progress.thirtyDays}
                    </button>
                </div>
            </div>

            {/* Hero Card: Primary Fat Burn Grams & Animated Sugar Cubes */}
            <div className={`p-6 sm:p-8 rounded-3xl border-2 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden transition-all duration-500 ${
                telemetry.isDeficit 
                    ? 'bg-gradient-to-b from-orange-500 to-amber-600 text-white border-orange-600 shadow-orange-500/20' 
                    : 'bg-gradient-to-b from-red-600 to-rose-700 text-white border-red-700 shadow-red-500/20'
            }`}>
                <div className="flex items-center gap-2 mb-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-widest">
                    {telemetry.isDeficit ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    <span>{telemetry.isDeficit ? t.progress.deficitBadge : t.progress.surplusBadge}</span>
                </div>

                <div className="flex items-baseline gap-1 my-2">
                    <span className="font-drama text-6xl sm:text-7xl font-bold tracking-tighter leading-none">
                        {telemetry.isDeficit ? `-${telemetry.fatGrams}` : `+${telemetry.fatGrams}`}
                    </span>
                    <span className="font-sans text-2xl font-bold opacity-80">{t.common.grams}</span>
                </div>

                <span className="font-sans text-xs uppercase font-bold tracking-widest opacity-90">
                    {telemetry.isDeficit ? t.progress.pureFatBurned : t.progress.estimatedFatStored}
                </span>

                {/* Animated Sugar Cubes Cascade Pill */}
                <div className="flex items-center gap-2 my-3 py-1.5 px-3.5 bg-white/20 backdrop-blur-md rounded-2xl border border-white/25 shadow-inner animate-in fade-in zoom-in duration-500">
                    {/* Animated cubes pouring in */}
                    <div className="flex items-center -space-x-1 overflow-visible py-0.5">
                        {Array.from({ length: Math.min(sugarCubesCount, 7) }).map((_, i) => (
                            <span
                                key={i}
                                style={{
                                    animationDelay: `${i * 80}ms`,
                                }}
                                className="inline-block w-3.5 h-3.5 bg-white/95 rounded-sm shadow-md border border-white/40 transform rotate-12 animate-in zoom-in-50 slide-in-from-top-3 duration-500 ease-out"
                                title="1 cube ≈ 4g"
                            />
                        ))}
                        {sugarCubesCount > 7 && (
                            <span className="text-[10px] font-sans font-bold pl-1.5 opacity-90">
                                +{sugarCubesCount - 7}
                            </span>
                        )}
                    </div>
                    <span className="text-xs font-sans font-bold tracking-tight">
                        &asymp; {sugarCubesCount} {t.progress.sugarCubesEquivalent}
                    </span>
                </div>

                {/* Sub Telemetry Grid */}
                <div className="mt-3 pt-3 border-t border-white/20 w-full flex justify-around text-center text-xs">
                    <div>
                        <span className="opacity-60 block text-[10px] uppercase font-bold">{t.progress.netEnergy}</span>
                        <strong className="font-data text-base font-bold">{telemetry.netDeficitKcal > 0 ? `-${telemetry.netDeficitKcal}` : `+${Math.abs(telemetry.netDeficitKcal)}`} {t.common.kcal}</strong>
                    </div>
                    <div className="w-[1px] bg-white/20" />
                    <div>
                        <span className="opacity-60 block text-[10px] uppercase font-bold">{t.progress.gymDays}</span>
                        <strong className="font-data text-base font-bold">{exerciseDaysCount} / {daysCount}</strong>
                    </div>
                </div>
            </div>

            {/* Optimal Plan Potential Card */}
            {optimalFatGrams > 0 && (
                <div className="p-5 rounded-3xl bg-white border-2 border-brutal-black/20 shadow-sm flex flex-col gap-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200/60">
                                <Sparkles size={16} />
                            </div>
                            <div>
                                <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-brutal-black">
                                    {t.progress.optimalPlanTitle}
                                </h3>
                                <span className="text-[11px] text-brutal-black/50 font-sans block">
                                    {t.progress.optimalPlanDesc}
                                </span>
                            </div>
                        </div>
                        <span className={`text-xs font-data font-bold px-2.5 py-1 rounded-full border ${
                            adherenceEfficiency >= 90
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : adherenceEfficiency >= 65
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                            {adherenceEfficiency}% {t.progress.planEfficiency}
                        </span>
                    </div>

                    {/* Comparison Meter */}
                    <div className="flex flex-col gap-1.5 pt-1">
                        <div className="flex justify-between text-xs font-sans font-semibold text-brutal-black/80">
                            <span>{t.progress.pureFatBurned}: <strong>-{telemetry.fatGrams} g</strong></span>
                            <span>{t.progress.optimalPlanTitle}: <strong>-{optimalFatGrams} g</strong></span>
                        </div>
                        <div className="w-full bg-black/5 h-3 rounded-full overflow-hidden p-0.5 border border-black/5">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${
                                    adherenceEfficiency >= 90 ? 'bg-emerald-500' : adherenceEfficiency >= 65 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, adherenceEfficiency)}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Telemetry Breakdown Grid */}
            <div className="grid grid-cols-2 gap-3 w-full">
                <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-sm flex flex-col justify-between">
                    <span className="font-sans text-[10px] uppercase font-bold text-brutal-black/50 tracking-wider">{t.progress.totalConsumed}</span>
                    <div className="flex items-baseline gap-1 mt-2">
                        <span className="font-data text-2xl font-bold text-brutal-black">{consumedKcal}</span>
                        <span className="text-[10px] uppercase font-semibold text-brutal-black/40 font-sans">{t.common.kcal}</span>
                    </div>
                    <span className="font-sans text-[10px] text-brutal-black/40 mt-1">{t.progress.avgPerDay}: {dailyAvgIntake} {t.common.kcal}</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-sm flex flex-col justify-between">
                    <span className="font-sans text-[10px] uppercase font-bold text-brutal-black/50 tracking-wider">{t.progress.totalBurned}</span>
                    <div className="flex items-baseline gap-1 mt-2">
                        <span className="font-data text-2xl font-bold text-orange-600">{telemetry.totalWeeklyBurn}</span>
                        <span className="text-[10px] uppercase font-semibold text-brutal-black/40 font-sans">{t.common.kcal}</span>
                    </div>
                    <span className="font-sans text-[10px] text-brutal-black/40 mt-1">{t.progress.avgPerDay}: {dailyAvgBurn} {t.common.kcal}</span>
                </div>
            </div>

            {/* Smartwatch Refinement Card */}
            <div className="p-5 rounded-3xl bg-white border border-black/5 shadow-sm flex flex-col gap-3">
                <div className="flex items-center gap-2 text-brutal-black/80 font-sans font-bold text-xs uppercase tracking-wider">
                    <Watch size={16} className="text-orange-500" />
                    <span>{t.progress.smartwatchTitle} ({period === '7d' ? t.progress.sevenDays : t.progress.thirtyDays})</span>
                </div>
                <p className="font-sans text-xs text-brutal-black/60 leading-relaxed">
                    {t.progress.smartwatchDesc}
                </p>

                <div className="flex items-center gap-2 mt-1">
                    <input
                        type="number"
                        placeholder={telemetry.totalWeeklyBurn.toString()}
                        value={smartwatchInput}
                        onChange={(e) => setSmartwatchInput(e.target.value)}
                        className="flex-1 bg-black/5 text-brutal-black px-4 py-2.5 rounded-2xl font-data font-bold text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-400/50 border border-transparent transition-all"
                    />
                    <button
                        onClick={handleSaveWatch}
                        className="px-4 py-2.5 bg-brutal-black text-off-white hover:bg-brutal-black/90 active:scale-95 transition-all rounded-2xl font-sans font-bold text-xs uppercase tracking-wider shadow-sm"
                    >
                        {t.common.apply}
                    </button>
                    {(period === '7d' ? smartwatchWeeklyBurn : smartwatchMonthlyBurn) && (
                        <button
                            onClick={handleResetWatch}
                            className="p-2.5 bg-black/5 hover:bg-black/10 text-brutal-black/60 rounded-2xl active:scale-95 transition-all"
                            title={t.common.reset}
                        >
                            <RotateCcw size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProgressView;
