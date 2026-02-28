import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore';

const MacroDashboard = () => {
    const { targetKcal, consumedKcal, targetProtein, consumedProtein } = useStore();

    const kcalRef = useRef(null);
    const proteinRef = useRef(null);
    const progressLineRef = useRef(null);

    // Math
    const kcalPercent = Math.min((consumedKcal / targetKcal) * 100, 100);
    const proteinPercent = Math.min((consumedProtein / targetProtein) * 100, 100);

    const isOverCalories = consumedKcal > targetKcal;
    const isExactCalories = consumedKcal === targetKcal && consumedKcal > 0;

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

        // Liquid fill line animation
        gsap.to(progressLineRef.current, {
            width: `${kcalPercent}%`,
            duration: 1.5,
            ease: 'power4.out'
        });
    }, [consumedKcal, targetKcal, consumedProtein, targetProtein, kcalPercent]);

    return (
        <div className="brutal-card w-full shadow-2xl relative bg-black text-off-white group">
            {/* Background Liquid fill visualizer for Calories */}
            <div className="absolute inset-0 overflow-hidden rounded-[inherit] pointer-events-none z-0">
                <div
                    ref={progressLineRef}
                    className="absolute inset-y-0 left-0 bg-signal-red/20"
                    style={{ width: '0%' }}
                />
            </div>

            {/* Floating % Badges over the edge */}
            <div className="absolute -top-3 -right-2 bg-signal-red text-white text-[12px] font-bold font-sans tracking-widest px-3 py-1 rounded-full shadow-[0_4px_10px_rgba(255,51,51,0.4)] border-[3px] border-black z-20 rotate-3 flex gap-1.5 items-baseline">
                <span className="opacity-70 text-[9px] uppercase font-bold">Kcal</span> {Math.round(kcalPercent)}%
            </div>
            <div className="absolute bottom-4 -right-2 bg-white text-black text-[12px] font-bold font-sans tracking-widest px-3 py-1 rounded-full shadow-[0_4px_10px_rgba(255,255,255,0.2)] border-[3px] border-black z-20 -rotate-3 flex gap-1.5 items-baseline">
                <span className="opacity-50 text-[9px] uppercase font-bold">Pro</span> {Math.round(proteinPercent)}%
            </div>

            <div className="relative z-10 p-6 flex flex-col justify-between h-56">
                <h2 className="font-sans text-[10px] uppercase tracking-[0.3em] opacity-60 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-signal-red animate-pulse" />
                    Macro Tracker
                </h2>

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
                        <span className="font-sans text-xs uppercase tracking-widest text-signal-red whitespace-nowrap">/ {targetKcal} KCAL</span>
                    </div>

                    {/* Protein Section */}
                    <div className="flex flex-col items-start w-full mt-2">
                        <div className="flex justify-end w-full items-baseline gap-2 opacity-80 group-hover:scale-[1.02] transition-transform duration-500 origin-right delay-75 mb-2">
                            <span ref={proteinRef} className="font-data text-3xl tracking-tighter leading-none">0</span>
                            <span className="font-sans text-[10px] uppercase tracking-widest whitespace-nowrap">/ {targetProtein}G PROTEIN</span>
                        </div>
                        {/* Continuous Protein Progress Bar (Left-to-Right) */}
                        <div className="w-[calc(100%+1.5rem)] h-[3px] bg-white/10 rounded-r-full overflow-hidden flex justify-start mt-1 -ml-6">
                            <div
                                className="h-full bg-white opacity-80 transition-all duration-1000 ease-out"
                                style={{ width: `${proteinPercent}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Brutalist structural accent */}
            <div className="absolute top-0 right-6 w-[1px] h-12 bg-off-white/20" />
            <div className="absolute bottom-6 left-0 w-12 h-[1px] bg-off-white/20" />
        </div>
    );
};

export default MacroDashboard;
