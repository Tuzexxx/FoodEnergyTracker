import React, { useState, useMemo, useEffect } from 'react';
import { Watch, RotateCcw, TrendingDown, TrendingUp, Activity, Sparkles, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useCompletedDaysTelemetry } from './WeeklyFatBurnModal';
import { getTranslation } from '../utils/i18n';
import { playSound } from '../utils/audio';

// Realistic 3D Isometric Sugar Cube SVG Component
export const SugarCubeIcon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 28, className = '', style = {} }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={`inline-block drop-shadow-md shrink-0 ${className}`} style={style}>
        {/* Ambient base shadow */}
        <ellipse cx="16" cy="27.5" rx="10" ry="3.5" fill="rgba(0,0,0,0.22)" />
        {/* Top facet - bright sparkling crystalline white */}
        <polygon points="16,3.5 27,9.5 16,15.5 5,9.5" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.8" />
        {/* Left facet - soft shaded white */}
        <polygon points="5,9.5 16,15.5 16,26 5,20" fill="#EAEFF6" stroke="#CBD5E1" strokeWidth="0.8" />
        {/* Right facet - deeper shadow for 3D depth */}
        <polygon points="16,15.5 27,9.5 27,20 16,26" fill="#D2DCE8" stroke="#94A3B8" strokeWidth="0.8" />
        {/* Crystalline sugar sparkles / micro-facets */}
        <circle cx="16" cy="9.5" r="0.7" fill="#CBD5E1" opacity="0.7" />
        <circle cx="12" cy="11.5" r="0.6" fill="#CBD5E1" opacity="0.6" />
        <circle cx="19" cy="12.5" r="0.6" fill="#FFFFFF" opacity="0.9" />
        <circle cx="10" cy="16.5" r="0.6" fill="#FFFFFF" opacity="0.8" />
        <circle cx="21" cy="18" r="0.7" fill="#94A3B8" opacity="0.6" />
    </svg>
);

const ProgressView: React.FC = () => {
    const [period, setPeriod] = useState<'7d' | '30d'>('7d');
    const [showSugarModal, setShowSugarModal] = useState(false);
    const [pourKey, setPourKey] = useState(0);

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

    // Retrigger falling sugar animation on tab or period switch
    useEffect(() => {
        setPourKey(prev => prev + 1);
    }, [period]);

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

            {/* Hero Card: Primary Fat Burn Grams & Animated 3D Sugar Cubes */}
            <div className={`p-6 sm:p-7 rounded-3xl border-2 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden transition-all duration-500 ${
                telemetry.isDeficit 
                    ? 'bg-gradient-to-b from-orange-500 to-amber-600 text-white border-orange-600 shadow-orange-500/20' 
                    : 'bg-gradient-to-b from-red-600 to-rose-700 text-white border-red-700 shadow-red-500/20'
            }`}>
                <div className="flex items-center gap-2 mb-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-widest">
                    {telemetry.isDeficit ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    <span>{telemetry.isDeficit ? t.progress.deficitBadge : t.progress.surplusBadge}</span>
                </div>

                <div className="flex items-center justify-center gap-4 my-1 w-full">
                    {/* Big Mass Display */}
                    <div className="flex items-baseline gap-1">
                        <span className="font-drama text-6xl sm:text-7xl font-bold tracking-tighter leading-none">
                            {telemetry.isDeficit ? `-${telemetry.fatGrams}` : `+${telemetry.fatGrams}`}
                        </span>
                        <span className="font-sans text-2xl font-bold opacity-80">{t.common.grams}</span>
                    </div>

                    {/* Animated Sugar Cubes Reservoir / Cascade Trigger */}
                    <button
                        onClick={() => {
                            setShowSugarModal(true);
                            playSound('click');
                        }}
                        key={pourKey}
                        className="relative bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-md rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1 shadow-lg transition-all active:scale-95 group cursor-pointer"
                        title={t.progress.showSugarPile}
                    >
                        {/* 3D Sugar Cubes Cascade Stack */}
                        <div className="relative h-12 w-14 flex items-center justify-center overflow-visible">
                            {Array.from({ length: Math.min(sugarCubesCount, 6) }).map((_, i) => {
                                const rotations = [-14, 18, -6, 22, -18, 10];
                                const offsetsX = [-8, 6, -2, 10, -10, 4];
                                const offsetsY = [10, 8, -4, -6, 2, -10];
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            animationDelay: `${i * 90}ms`,
                                            transform: `translate(${offsetsX[i % offsetsX.length]}px, ${offsetsY[i % offsetsY.length]}px) rotate(${rotations[i % rotations.length]}deg)`
                                        }}
                                        className="absolute animate-in zoom-in-50 slide-in-from-top-6 duration-600 ease-out pointer-events-none"
                                    >
                                        <SugarCubeIcon size={22} />
                                    </div>
                                );
                            })}
                        </div>

                        <span className="text-[10px] font-sans font-bold bg-white/30 px-2 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                            &asymp; {sugarCubesCount} {t.progress.sugarCubesEquivalent}
                        </span>
                    </button>
                </div>

                <span className="font-sans text-xs uppercase font-bold tracking-widest opacity-90 mt-1">
                    {telemetry.isDeficit ? t.progress.pureFatBurned : t.progress.estimatedFatStored}
                </span>

                {/* Sub Telemetry Grid */}
                <div className="mt-4 pt-3 border-t border-white/20 w-full flex justify-around text-center text-xs">
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

            {/* Full Visual Sugar Cubes Cascade Modal Overlay */}
            {showSugarModal && (
                <div
                    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setShowSugarModal(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm bg-white text-brutal-black border-2 border-brutal-black rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col gap-4 max-h-[85vh] overflow-y-auto"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <SugarCubeIcon size={24} />
                                <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-brutal-black">
                                    {t.progress.sugarModalTitle}
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowSugarModal(false)}
                                className="p-1.5 hover:bg-black/5 rounded-full transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <p className="text-xs text-brutal-black/70 font-sans leading-relaxed">
                            {t.progress.sugarModalDesc}
                        </p>

                        {/* Interactive Sugar Pile Container */}
                        <div className="p-5 bg-gradient-to-b from-orange-50 to-amber-100/70 border-2 border-orange-200/80 rounded-2xl flex flex-col items-center justify-center gap-3">
                            <div className="flex items-baseline gap-1.5">
                                <span className="font-drama text-5xl font-bold text-orange-600 tracking-tight leading-none">
                                    {sugarCubesCount}
                                </span>
                                <span className="font-sans font-bold text-sm text-orange-950 uppercase tracking-wider">
                                    {t.progress.sugarCubesEquivalent}
                                </span>
                            </div>

                            {/* Realistic Sugar Cube Cluster (all cubes rendered in structured masonry) */}
                            <div className="flex flex-wrap items-center justify-center gap-1.5 max-h-48 overflow-y-auto p-2 bg-white/70 rounded-xl border border-orange-200/60 w-full shadow-inner">
                                {Array.from({ length: sugarCubesCount }).map((_, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            animationDelay: `${Math.min(i * 25, 800)}ms`,
                                        }}
                                        className="animate-in zoom-in-50 slide-in-from-top-2 duration-300 ease-out"
                                        title={`Sugar cube #${i + 1} (4g)`}
                                    >
                                        <SugarCubeIcon size={20} />
                                    </div>
                                ))}
                            </div>

                            <span className="text-[11px] font-sans font-semibold text-orange-900/80 text-center">
                                = {Math.round(sugarCubesCount * 4)} g ekvivalentní energie cukru ({telemetry.fatGrams} g čistého tělesného tuku)
                            </span>
                        </div>

                        <button
                            onClick={() => setShowSugarModal(false)}
                            className="w-full py-3 bg-brutal-black text-off-white font-sans font-bold text-xs uppercase tracking-wider rounded-2xl shadow-md hover:bg-black active:scale-98 transition"
                        >
                            {t.common.done}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProgressView;
