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
        <div className="brutal-card w-full shadow-2xl relative bg-black text-off-white overflow-hidden group">
            {/* Background Liquid fill visualizer behind the numbers */}
            <div
                ref={progressLineRef}
                className="absolute inset-y-0 left-0 bg-signal-red/20 pointer-events-none"
                style={{ width: '0%' }}
            />

            <div className="relative z-10 p-6 flex flex-col justify-between h-56">
                <h2 className="font-sans text-[10px] uppercase tracking-[0.3em] opacity-60 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-signal-red animate-pulse" />
                    Telemetry Center
                </h2>

                <div className="flex flex-col gap-1 items-end mt-auto w-full">
                    <div className="flex items-baseline gap-2 group-hover:scale-[1.02] transition-transform duration-500 origin-right">
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

                    <div className="flex flex-col items-end w-full max-w-[80%] mt-2">
                        <div className="flex items-baseline gap-2 opacity-80 group-hover:scale-[1.02] transition-transform duration-500 origin-right delay-75 mb-1">
                            <span ref={proteinRef} className="font-data text-3xl tracking-tighter leading-none">0</span>
                            <span className="font-sans text-[10px] uppercase tracking-widest whitespace-nowrap">/ {targetProtein}G PROTEIN</span>
                        </div>
                        {/* Thin Protein Progress Bar */}
                        <div className="w-full h-[2px] bg-off-white/10 rounded-full overflow-hidden flex justify-end">
                            <div
                                className="h-full bg-off-white transition-all duration-1000 ease-out"
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
