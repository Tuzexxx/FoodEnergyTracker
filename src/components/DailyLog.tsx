import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const DailyLog = () => {
    const { dailyLog } = useStore();
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || dailyLog.length === 0) return;

        const cards = gsap.utils.toArray('.log-card') as HTMLElement[];

        // Animate *new* entries dropping in (only animation needed now)
        if (cards.length > 0) {
            gsap.fromTo(cards[0],
                { y: -20, opacity: 0, scale: 0.95 },
                { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' }
            );
        }
    }, [dailyLog]);

    return (
        <div ref={containerRef} className="flex flex-col gap-4 mt-8 pb-32">
            <h3 className="font-sans text-sm uppercase tracking-widest opacity-50 mb-2 sticky top-20 z-20 bg-off-white/80 backdrop-blur py-2 mix-blend-multiply">
                Daily Archive Sequences
            </h3>

            {dailyLog.length === 0 ? (
                <div className="brutal-card p-8 border-dashed border-brutal-black/20 bg-transparent opacity-50 text-center">
                    <p className="font-sans text-sm uppercase tracking-widest">No telemetry recorded</p>
                    <div className="w-8 h-[1px] bg-brutal-black/30 mx-auto mt-4"></div>
                </div>
            ) : (
                <div className="flex flex-col gap-3 relative z-10">
                    {dailyLog.map((entry, i) => (
                        <div
                            key={entry.id}
                            className={`log-card brutal-card p-5 flex justify-between items-center transition-all duration-300 border border-transparent hover:border-brutal-black/30 hover:shadow-lg bg-paper sticky z-${50 - i}`}
                            style={{
                                zIndex: 50 - i,
                                top: `${100 + (i * 10)}px`,
                                transform: `scale(${1 - (i * 0.02)})`,
                                filter: i > 0 ? `blur(${Math.min(i, 4)}px)` : 'none',
                                opacity: Math.max(0.3, 1 - (i * 0.1))
                            }}
                        >
                            <div>
                                <p className="font-sans font-medium text-lg leading-tight mb-1">{entry.name}</p>
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-signal-red/50"></span>
                                    <p className="font-data text-xs opacity-50 tracking-widest">
                                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>

                            <div className="text-right flex flex-col items-end">
                                <div className="flex items-baseline gap-1">
                                    <p className="font-data text-2xl tracking-tighter leading-none">{entry.kcal}</p>
                                    <span className="text-[9px] uppercase tracking-widest text-signal-red font-sans">KCAL</span>
                                </div>

                                <div className="flex gap-3 font-data text-[10px] opacity-40 mt-2 border-t border-brutal-black/10 pt-1">
                                    <span className="flex gap-1">
                                        <span className="opacity-50">P</span>{entry.protein}
                                    </span>
                                    <span className="flex gap-1">
                                        <span className="opacity-50">C</span>{entry.carbs}
                                    </span>
                                    <span className="flex gap-1">
                                        <span className="opacity-50">F</span>{entry.fat}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DailyLog;
