import { useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { AlertCircle, CheckCircle2, Flame } from 'lucide-react';
import { useStore, EXERCISE_BONUS_KCAL, EXERCISE_BONUS_PROTEIN } from '../store/useStore';
import { calculateMacroDistribution } from '../utils/calorieFormula';

const MacroDashboard = () => {
    const { targetKcal, consumedKcal, targetProtein, consumedProtein, dailyLog, exerciseDay, toggleExerciseDay, profile } = useStore();

    const showGymButton = !profile?.activityLevel || profile?.activityLevel === 'SEDENTARY' || profile?.activityLevel === 'LIGHT';

    const effectiveKcal = targetKcal + (exerciseDay ? EXERCISE_BONUS_KCAL : 0);
    const effectiveProtein = targetProtein + (exerciseDay ? EXERCISE_BONUS_PROTEIN : 0);

    // Sum consumed carbs and fats from daily log
    const { consumedCarbs, consumedFat } = useMemo(() => {
        let carbs = 0;
        let fat = 0;
        (dailyLog || []).forEach(item => {
            carbs += (item.carbs || 0);
            fat += (item.fat || 0);
        });
        return { consumedCarbs: Math.round(carbs), consumedFat: Math.round(fat) };
    }, [dailyLog]);

    // Optimal macro targets
    const optimalMacros = useMemo(() => {
        return calculateMacroDistribution(effectiveKcal, effectiveProtein);
    }, [effectiveKcal, effectiveProtein]);

    const kcalRef = useRef<HTMLSpanElement>(null);
    const proteinRef = useRef<HTMLSpanElement>(null);
    const kcalBarRef = useRef<HTMLDivElement>(null);
    const kcalOverflowBarRef = useRef<HTMLDivElement>(null);

    const isOverCalories = consumedKcal > effectiveKcal;
    const isExactCalories = consumedKcal === effectiveKcal && consumedKcal > 0;

    const kcalRawPercent = effectiveKcal > 0 ? (consumedKcal / effectiveKcal) * 100 : 0;
    const kcalPercent = Math.min(kcalRawPercent, 100);
    const kcalOverflowPercent = Math.max(0, Math.min(kcalRawPercent - 100, 100));

    // True percentages (e.g. 120% when 20% over target)
    const isPOver = consumedProtein > effectiveProtein;
    const isCOver = consumedCarbs > optimalMacros.carbsGrams && optimalMacros.carbsGrams > 0;
    const isFOver = consumedFat > optimalMacros.fatGrams && optimalMacros.fatGrams > 0;

    const pPercent = effectiveProtein > 0 ? Math.round((consumedProtein / effectiveProtein) * 100) : 0;
    const cPercent = optimalMacros.carbsGrams > 0 ? Math.round((consumedCarbs / optimalMacros.carbsGrams) * 100) : 0;
    const fPercent = optimalMacros.fatGrams > 0 ? Math.round((consumedFat / optimalMacros.fatGrams) * 100) : 0;

    const pVisualWidth = Math.min(100, pPercent);
    const cVisualWidth = Math.min(100, cPercent);
    const fVisualWidth = Math.min(100, fPercent);

    useEffect(() => {
        // Number counter animation
        if (kcalRef.current) {
            gsap.to(kcalRef.current, {
                innerHTML: consumedKcal,
                duration: 1.5,
                snap: { innerHTML: 1 },
                ease: 'power3.out'
            });
        }

        if (proteinRef.current) {
            gsap.to(proteinRef.current, {
                innerHTML: consumedProtein,
                duration: 1.5,
                snap: { innerHTML: 1 },
                ease: 'power3.out'
            });
        }

        // Progress bar animations
        if (kcalBarRef.current) {
            gsap.to(kcalBarRef.current, {
                width: `${kcalPercent}%`,
                duration: 1.5,
                ease: 'power4.out'
            });
        }

        if (kcalOverflowBarRef.current) {
            gsap.to(kcalOverflowBarRef.current, {
                width: `${kcalOverflowPercent}%`,
                duration: 1.5,
                delay: 0.2,
                ease: 'power4.out'
            });
        }
    }, [consumedKcal, consumedProtein, kcalPercent, kcalOverflowPercent]);

    return (
        <div className="brutal-card w-full shadow-2xl relative bg-black text-off-white group overflow-hidden border-2 border-brutal-black">
            {/* Red kcal progress fill */}
            <div
                ref={kcalBarRef}
                className="absolute inset-y-0 left-0 bg-signal-red/20 pointer-events-none"
                style={{ width: '0%' }}
            />
            {/* Red kcal overflow fill */}
            <div
                ref={kcalOverflowBarRef}
                className="absolute inset-y-0 left-0 bg-signal-red/40 pointer-events-none"
                style={{ width: '0%' }}
            />

            <div className="relative z-10 p-6 pb-4 flex flex-col justify-between">
                {/* Card Top Row */}
                <div className="flex items-center justify-between">
                    <h2 className="font-sans text-[10px] uppercase tracking-[0.3em] opacity-60 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-signal-red animate-pulse" />
                        Macro Tracker
                    </h2>

                    {/* Exercise Day toggle */}
                    {showGymButton && (
                        <button
                            onClick={toggleExerciseDay}
                            title={exerciseDay ? `Exercise day: +${EXERCISE_BONUS_KCAL} kcal` : 'Mark as exercise day'}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider transition-all duration-300 ${exerciseDay
                                ? 'bg-signal-red text-white shadow-[0_0_12px_rgba(255,51,51,0.6)] animate-pulse'
                                : 'bg-off-white/10 text-off-white/60 hover:bg-off-white/20'
                                }`}
                        >
                            <Flame size={12} />
                            {exerciseDay ? `+${EXERCISE_BONUS_KCAL}` : 'GYM'}
                        </button>
                    )}
                </div>

                {/* Main Calorie & Protein Primary Counters */}
                <div className="flex flex-col gap-1 items-end mt-4 mb-4 w-full">
                    {/* Calories */}
                    <div className="flex items-baseline gap-2 group-hover:scale-[1.02] transition-transform duration-500 origin-right">
                        {isOverCalories && <AlertCircle className="text-signal-red animate-pulse" size={24} />}
                        {isExactCalories && <CheckCircle2 className="text-green-500" size={24} />}
                        <span
                            ref={kcalRef}
                            className={`font-data text-7xl tracking-tighter leading-none ${isOverCalories ? 'text-signal-red drop-shadow-[0_0_15px_rgba(255,51,51,0.5)]' : ''}`}
                        >
                            {consumedKcal}
                        </span>
                        <span className="font-sans text-xs uppercase tracking-widest text-signal-red whitespace-nowrap">
                            / {effectiveKcal} KCAL
                        </span>
                    </div>

                    {/* Protein Quick Summary */}
                    <div className="flex justify-end w-full items-baseline gap-2 opacity-90 group-hover:scale-[1.02] transition-transform duration-500 origin-right">
                        <span ref={proteinRef} className="font-data text-3xl tracking-tighter leading-none text-emerald-400">
                            {consumedProtein}
                        </span>
                        <span className="font-sans text-[10px] uppercase tracking-widest whitespace-nowrap text-emerald-400/80">
                            / {effectiveProtein}G PROTEIN
                        </span>
                    </div>
                </div>

                {/* Macro Rows: Protein (Full Width) on Top + Carbs & Fat (Side-by-Side) Below */}
                <div className="mt-2 pt-3 border-t border-white/5 flex flex-col gap-2 opacity-90 hover:opacity-100 transition-opacity">
                    {/* 1. Protein Row (Full Width Dedicated Line) */}
                    <div className="flex items-center gap-2.5 w-full text-[9px] font-sans">
                        <div className="w-14 shrink-0 flex items-center justify-between text-emerald-400/90 font-bold uppercase tracking-wider">
                            <span>PRO</span>
                            <span className="font-data text-[10px] text-white/90">{pPercent}%</span>
                        </div>
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${isPOver ? 'bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]' : 'bg-emerald-500/70'}`}
                                style={{ width: `${pVisualWidth}%` }}
                            />
                        </div>
                        <div className="w-28 shrink-0 text-right font-data font-medium text-white/50 text-[10px]">
                            {consumedProtein}/{effectiveProtein}g {isPOver && <span className="text-emerald-400 font-bold">(+{consumedProtein - effectiveProtein}g)</span>}
                        </div>
                    </div>

                    {/* 2. Carbs & Fat Row (Side-by-Side on the bottom line) */}
                    <div className="grid grid-cols-2 gap-3 w-full text-[9px] font-sans pt-0.5">
                        {/* Carbs */}
                        <div className="flex items-center gap-1.5">
                            <div className="shrink-0 flex items-center gap-1 text-amber-400/90 font-bold uppercase tracking-wider">
                                <span>CARB</span>
                                <span className="font-data text-[10px] text-white/90">{cPercent}%</span>
                            </div>
                            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden min-w-[24px]">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${isCOver ? 'bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.8)]' : 'bg-amber-500/70'}`}
                                    style={{ width: `${cVisualWidth}%` }}
                                />
                            </div>
                            <div className="shrink-0 font-data font-medium text-white/50 text-[9px]">
                                {consumedCarbs}/{optimalMacros.carbsGrams}g {isCOver && <span className="text-amber-400 font-bold">(+{consumedCarbs - optimalMacros.carbsGrams}g)</span>}
                            </div>
                        </div>

                        {/* Fat */}
                        <div className="flex items-center gap-1.5">
                            <div className="shrink-0 flex items-center gap-1 text-rose-400/90 font-bold uppercase tracking-wider">
                                <span>FAT</span>
                                <span className="font-data text-[10px] text-white/90">{fPercent}%</span>
                            </div>
                            <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden min-w-[24px]">
                                <div
                                    className={`h-full rounded-full transition-all duration-700 ${isFOver ? 'bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.8)]' : 'bg-rose-500/70'}`}
                                    style={{ width: `${fVisualWidth}%` }}
                                />
                            </div>
                            <div className="shrink-0 font-data font-medium text-white/50 text-[9px]">
                                {consumedFat}/{optimalMacros.fatGrams}g {isFOver && <span className="text-rose-400 font-bold">(+{consumedFat - optimalMacros.fatGrams}g)</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MacroDashboard;
