import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore';

const MacroDashboard = () => {
    const { targetKcal, consumedKcal, targetProtein, consumedProtein } = useStore();

    const kcalRef = useRef(null);
    const proteinRef = useRef(null);
    const kcalBarRef = useRef(null);
    const proteinBarRef = useRef(null);

    const isOverCalories = consumedKcal > targetKcal;
    const isExactCalories = consumedKcal === targetKcal && consumedKcal > 0;

    const kcalPercent = Math.min((consumedKcal / targetKcal) * 100, 100);
    const proteinPercent = Math.min((consumedProtein / targetProtein) * 100, 100);

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
    }, [consumedKcal, consumedProtein, kcalPercent, proteinPercent]);

    return (
        <div className="brutal-card w-full shadow-2xl relative bg-black text-off-white group overflow-hidden">
            {/* Red kcal progress fill */}
            <div
                ref={kcalBarRef}
                className="absolute inset-y-0 left-0 bg-signal-red/20 pointer-events-none"
                style={{ width: '0%' }}
            />

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
                    </div>
                </div>
            </div>

            {/* Protein progress bar */}
            <div className="absolute bottom-6 left-0 w-full h-[3px] bg-off-white/10">
                <div
                    ref={proteinBarRef}
                    className="h-full bg-off-white/50 transition-all duration-1000 ease-out"
                    style={{ width: '0%' }}
                />
            </div>


        </div>
    );
};

export default MacroDashboard;
