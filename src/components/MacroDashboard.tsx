import { useState, useEffect, useRef, useMemo } from 'react';
import gsap from 'gsap';
import { AlertCircle, CheckCircle2, Flame } from 'lucide-react';
import { useStore, EXERCISE_BONUS_KCAL, EXERCISE_BONUS_PROTEIN } from '../store/useStore';
import { calculateMacroDistribution } from '../utils/calorieFormula';
import { getTranslation } from '../utils/i18n';

const MacroDashboard = () => {
    const { targetKcal, consumedKcal, targetProtein, consumedProtein, dailyLog, exerciseDay, toggleExerciseDay, profile, language } = useStore();
    const t = getTranslation(language);

    const showGymButton = !profile?.activityLevel || profile?.activityLevel === 'SEDENTARY' || profile?.activityLevel === 'LIGHT';

    const effectiveKcal = targetKcal + (exerciseDay ? EXERCISE_BONUS_KCAL : 0);
    const effectiveProtein = targetProtein + (exerciseDay ? EXERCISE_BONUS_PROTEIN : 0);

    // Sum consumed carbs and fats from daily log
    const consumedCarbs = useMemo(() => {
        return Math.round(dailyLog.reduce((sum, item) => sum + (item.carbs || 0), 0));
    }, [dailyLog]);

    const consumedFat = useMemo(() => {
        return Math.round(dailyLog.reduce((sum, item) => sum + (item.fat || 0), 0));
    }, [dailyLog]);

    // Optimal macro targets
    const optimalMacros = useMemo(() => {
        return calculateMacroDistribution(effectiveKcal, effectiveProtein);
    }, [effectiveKcal, effectiveProtein]);

    const [showSecondaryMacros, setShowSecondaryMacros] = useState<boolean>(() => {
        const saved = localStorage.getItem('macrotrack_show_secondary');
        return saved !== null ? saved === 'true' : true;
    });

    const toggleSecondaryMacros = () => {
        setShowSecondaryMacros((prev: boolean) => {
            const next = !prev;
            localStorage.setItem('macrotrack_show_secondary', String(next));
            return next;
        });
    };

    const kcalRef = useRef<HTMLSpanElement>(null);
    const proteinRef = useRef<HTMLSpanElement>(null);
    const kcalBarRef = useRef<HTMLDivElement>(null);
    const kcalOverflowBarRef = useRef<HTMLDivElement>(null);

    const isOverCalories = consumedKcal > effectiveKcal;
    const isExactCalories = consumedKcal === effectiveKcal && consumedKcal > 0;

    const kcalRawPercent = effectiveKcal > 0 ? (consumedKcal / effectiveKcal) * 100 : 0;
    const kcalPercent = Math.min(kcalRawPercent, 100);
    const kcalOverflowPercent = Math.max(0, Math.min(kcalRawPercent - 100, 100));

    // Protein, Carbs, Fat percentages & overflow math
    const pRawPercent = effectiveProtein > 0 ? (consumedProtein / effectiveProtein) * 100 : 0;
    const pPercent = Math.min(pRawPercent, 100);
    const pOverflowPercent = Math.max(0, Math.min(pRawPercent - 100, 100));

    const cRawPercent = optimalMacros.carbsGrams > 0 ? (consumedCarbs / optimalMacros.carbsGrams) * 100 : 0;
    const cPercent = Math.min(cRawPercent, 100);
    const cOverflowPercent = Math.max(0, Math.min(cRawPercent - 100, 100));

    const fRawPercent = optimalMacros.fatGrams > 0 ? (consumedFat / optimalMacros.fatGrams) * 100 : 0;
    const fPercent = Math.min(fRawPercent, 100);
    const fOverflowPercent = Math.max(0, Math.min(fRawPercent - 100, 100));

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
        <div
            onClick={toggleSecondaryMacros}
            className="brutal-card w-full shadow-2xl relative bg-black text-off-white group overflow-hidden border-2 border-brutal-black cursor-pointer select-none"
            title={t.macro.clickToToggle}
        >
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

            <div className="relative z-10 p-6 pb-2 flex flex-col justify-between">
                {/* Card Top Row */}
                <div className="flex items-center justify-between">
                    <h2 className="font-sans text-[10px] uppercase tracking-[0.3em] opacity-60 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-signal-red animate-pulse" />
                        {t.macro.trackerTitle}
                    </h2>

                    {/* Exercise Day toggle */}
                    {showGymButton && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleExerciseDay();
                            }}
                            title={exerciseDay ? `${t.macro.gymActive} (+ ${EXERCISE_BONUS_KCAL} ${t.common.kcal})` : t.macro.gymInactive}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider transition-all duration-300 ${exerciseDay
                                ? 'bg-signal-red text-white shadow-[0_0_12px_rgba(255,51,51,0.6)] animate-pulse'
                                : 'bg-off-white/10 text-off-white/60 hover:bg-off-white/20'
                                }`}
                        >
                            <Flame size={12} />
                            {exerciseDay ? `+${EXERCISE_BONUS_KCAL}` : t.tabs.day === 'Day' ? 'GYM' : 'GYM'}
                        </button>
                    )}
                </div>

                {/* Main Calorie & Protein Counters */}
                <div className="flex flex-col gap-1 items-end mt-4 mb-3 w-full">
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
                            / {effectiveKcal} {t.common.kcal.toUpperCase()}
                        </span>
                    </div>

                    {/* Protein Counter & Dedicated Full-Width Progress Bar Directly Underneath */}
                    <div className="flex flex-col items-end w-full mt-1">
                        <div className="flex justify-end w-full items-baseline gap-2 opacity-90 group-hover:scale-[1.02] transition-transform duration-500 origin-right">
                            <span ref={proteinRef} className="font-data text-3xl tracking-tighter leading-none text-white">
                                {consumedProtein}
                            </span>
                            <span className="font-sans text-[10px] uppercase tracking-widest whitespace-nowrap text-white/80">
                                / {effectiveProtein}G {t.common.protein.toUpperCase()}
                            </span>
                        </div>

                        {/* Full-width protein progress line directly below protein numbers */}
                        <div className="-mx-6 w-[calc(100%+48px)] h-1 bg-white/10 overflow-hidden mt-3 relative">
                            {/* Base track (0 to 100%) */}
                            <div
                                className="h-full bg-white/40 transition-all duration-700"
                                style={{ width: `${pPercent}%` }}
                            />
                            {/* Overflow track (>100% wrapping from 0%) */}
                            {pOverflowPercent > 0 && (
                                <div
                                    className="absolute inset-y-0 left-0 h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)] transition-all duration-700"
                                    style={{ width: `${pOverflowPercent}%` }}
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Carbs & Fat Section */}
            <div className="relative z-10 flex flex-col w-full mt-1">
                {/* Info Row Above Lines (Collapsible) */}
                {showSecondaryMacros && (
                    <div className="flex items-center justify-between text-[9px] font-sans font-medium uppercase tracking-wider px-6 pb-1.5 w-full animate-in fade-in duration-200">
                        <span className="text-amber-400/90 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                            {t.common.carbs.toUpperCase()} &middot; {consumedCarbs}/{optimalMacros.carbsGrams}g
                        </span>
                        <span className="text-rose-400/90 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
                            {t.common.fat.toUpperCase()} &middot; {consumedFat}/{optimalMacros.fatGrams}g
                        </span>
                    </div>
                )}

                {/* 100% Full-Width Flush Bottom Progress Bar */}
                <div className={`w-full grid grid-cols-2 gap-0.5 overflow-hidden transition-all duration-300 ${showSecondaryMacros ? 'h-1.5 bg-white/10 opacity-100' : 'h-1 bg-white/10 opacity-60'}`}>
                    {/* Carbs Bar (Left Half) */}
                    <div className="h-full bg-white/5 overflow-hidden relative">
                        <div
                            className="h-full bg-amber-500/60 transition-all duration-700"
                            style={{ width: `${cPercent}%` }}
                        />
                        {cOverflowPercent > 0 && (
                            <div
                                className="absolute inset-y-0 left-0 h-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)] transition-all duration-700"
                                style={{ width: `${cOverflowPercent}%` }}
                            />
                        )}
                    </div>
                    {/* Fat Bar (Right Half) */}
                    <div className="h-full bg-white/5 overflow-hidden relative">
                        <div
                            className="h-full bg-rose-500/60 transition-all duration-700"
                            style={{ width: `${fPercent}%` }}
                        />
                        {fOverflowPercent > 0 && (
                            <div
                                className="absolute inset-y-0 left-0 h-full bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)] transition-all duration-700"
                                style={{ width: `${fOverflowPercent}%` }}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MacroDashboard;
