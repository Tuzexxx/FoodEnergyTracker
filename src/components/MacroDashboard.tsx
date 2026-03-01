import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { AlertCircle, CheckCircle2, Flame } from 'lucide-react';
import { useStore, EXERCISE_BONUS_KCAL } from '../store/useStore';

const MacroDashboard = () => {
    const { targetKcal, consumedKcal, targetProtein, consumedProtein, exerciseDay, toggleExerciseDay, profile } = useStore();

    const isLightActivity = profile?.activityLevel === 'LIGHT' || !profile?.activityLevel;

    const effectiveKcal = targetKcal + (exerciseDay ? EXERCISE_BONUS_KCAL : 0);
    const effectiveProtein = targetProtein; // protein target unchanged on exercise days

    const kcalRef = useRef(null);
    const proteinRef = useRef(null);
    const kcalBarRef = useRef(null);
    const kcalOverflowBarRef = useRef(null);
    const proteinBarRef = useRef(null);
    const proteinOverflowBarRef = useRef(null);

    const isOverCalories = consumedKcal > effectiveKcal;
    const isExactCalories = consumedKcal === effectiveKcal && consumedKcal > 0;

    const kcalRawPercent = (consumedKcal / effectiveKcal) * 100;
    const proteinRawPercent = (consumedProtein / effectiveProtein) * 100;

    const kcalPercent = Math.min(kcalRawPercent, 100);
    const kcalOverflowPercent = Math.max(0, Math.min(kcalRawPercent - 100, 100));

    const proteinPercent = Math.min(proteinRawPercent, 100);
    const proteinOverflowPercent = Math.max(0, Math.min(proteinRawPercent - 100, 100));

    useEffect(() => {
        // Number counter animation
        gsap.to(kcalRef.current, {
            innerHTML: consumedKcal,
            duration: 1.5,
            snap: { innerHTML: 1 },
            ease: 'power3.out'
        });

        gsap.to(proteinRef.current, {
            innerHTML: consumedProtein,
            duration: 1.5,
            snap: { innerHTML: 1 },
            ease: 'power3.out'
        });

        // Progress bar animations
        gsap.to(kcalBarRef.current, {
            width: `${kcalPercent}%`,
            duration: 1.5,
            ease: 'power4.out'
        });

        gsap.to(proteinBarRef.current, {
            width: `${proteinPercent}%`,
            duration: 1.5,
            ease: 'power4.out'
        });

        if (kcalOverflowBarRef.current) {
            gsap.to(kcalOverflowBarRef.current, {
                width: `${kcalOverflowPercent}%`,
                duration: 1.5,
                delay: 0.2,
                ease: 'power4.out'
            });
        }

        if (proteinOverflowBarRef.current) {
            gsap.to(proteinOverflowBarRef.current, {
                width: `${proteinOverflowPercent}%`,
                duration: 1.5,
                delay: 0.2,
                ease: 'power4.out'
            });
        }
    }, [consumedKcal, consumedProtein, kcalPercent, proteinPercent, kcalOverflowPercent, proteinOverflowPercent]);

    return (
        <div className="brutal-card w-full shadow-2xl relative bg-black text-off-white group overflow-hidden">
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

            <div className="relative z-10 p-6 flex flex-col justify-between h-56">
                <h2 className="font-sans text-[10px] uppercase tracking-[0.3em] opacity-60 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-signal-red animate-pulse" />
                    Macro Tracker
                </h2>

                {/* Exercise Day toggle — only shown for Daily Walker (energy not already baked into PAL) */}
                {isLightActivity && (
                    <button
                        onClick={toggleExerciseDay}
                        title={exerciseDay ? `Exercise day: +${EXERCISE_BONUS_KCAL} kcal` : 'Mark as exercise day'}
                        className={`absolute top-4 right-4 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-wider transition-all duration-300 ${exerciseDay
                            ? 'bg-signal-red text-white shadow-[0_0_12px_rgba(255,51,51,0.6)] animate-pulse'
                            : 'bg-off-white/10 text-off-white/50 hover:bg-off-white/20'
                            }`}
                    >
                        <Flame size={12} />
                        {exerciseDay ? `+${EXERCISE_BONUS_KCAL}` : 'GYM'}
                    </button>
                )}

                <div className="flex flex-col gap-4 items-end mt-auto w-full">
                    {/* Calories Section */}
                    <div className="flex items-baseline gap-2 group-hover:scale-[1.02] transition-transform duration-500 origin-right mb-2">
                        {isOverCalories && <AlertCircle className="text-signal-red animate-pulse" size={24} />}
                        {isExactCalories && <CheckCircle2 className="text-green-500" size={24} />}
                        <span
                            ref={kcalRef}
                            className={`font-data text-7xl tracking-tighter leading-none ${isOverCalories ? 'text-signal-red drop-shadow-[0_0_15px_rgba(255,51,51,0.5)]' : ''}`}
                        >
                            0
                        </span>
                        <span className="font-sans text-xs uppercase tracking-widest text-signal-red whitespace-nowrap">/ {effectiveKcal} KCAL</span>
                    </div>

                    {/* Protein Section */}
                    <div className="flex flex-col items-start w-full mt-2">
                        <div className="flex justify-end w-full items-baseline gap-2 opacity-80 group-hover:scale-[1.02] transition-transform duration-500 origin-right delay-75 mb-2">
                            <span ref={proteinRef} className="font-data text-3xl tracking-tighter leading-none">0</span>
                            <span className="font-sans text-[10px] uppercase tracking-widest whitespace-nowrap">/ {effectiveProtein}G PROTEIN</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Protein progress bar background */}
            <div className="absolute bottom-6 left-0 w-full h-[3px] bg-off-white/10">
                {/* Base Protein Bar */}
                <div
                    ref={proteinBarRef}
                    className="h-full bg-off-white/50 transition-all duration-1000 ease-out"
                    style={{ width: '0%' }}
                />
                {/* Overflow Protein Bar */}
                <div
                    ref={proteinOverflowBarRef}
                    className="absolute inset-0 bg-off-white transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                    style={{ width: '0%' }}
                />
            </div>
        </div>
    );
};

export default MacroDashboard;
