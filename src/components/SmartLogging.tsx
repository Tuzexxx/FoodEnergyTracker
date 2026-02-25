import { useState, useRef, useEffect } from 'react';
import { Camera, Send, X, Activity } from 'lucide-react';
import gsap from 'gsap';
import { useStore } from '../store/useStore';

// Mock AI Logic
const mockAiResponse = (input: string) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            const lowerInput = input.toLowerCase();

            // Exact match parsing
            if (lowerInput.includes('chicken wrap')) {
                resolve({ type: 'success', data: { name: 'Chicken Wrap', kcal: 450, protein: 35, carbs: 40, fat: 12 } });
            }
            else if (lowerInput.includes('eggs') || lowerInput.includes('egg')) {
                resolve({ type: 'success', data: { name: '2x Scrambled Eggs', kcal: 140, protein: 12, carbs: 2, fat: 10 } });
            }
            // Ambiguous match triggers 'The Interrogator'
            else if (lowerInput.includes('chips')) {
                resolve({
                    type: 'clarification',
                    question: 'Incomplete data sequence. Quantify "chips".',
                    options: ['Small Bag (40g)', 'Large Bag (150g)', 'Handful']
                });
            }
            // Fallback pseudo-random macro assignment
            else {
                resolve({ type: 'success', data: { name: input, kcal: Math.floor(Math.random() * 500) + 100, protein: Math.floor(Math.random() * 40) + 5, carbs: Math.floor(Math.random() * 60) + 10, fat: Math.floor(Math.random() * 30) + 5 } });
            }
        }, 1500); // Mock processing delay
    });
};

const SmartLogging = () => {
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [interrogation, setInterrogation] = useState<any>(null);
    const { isCalibrated, addEntry } = useStore();

    const interrogatePanelRef = useRef(null);
    const scannerRef = useRef(null);

    useEffect(() => {
        if (isProcessing) {
            gsap.to(scannerRef.current, {
                x: '100%',
                duration: 1.5,
                repeat: -1,
                yoyo: true,
                ease: 'power1.inOut'
            });
        } else {
            gsap.killTweensOf(scannerRef.current);
        }
    }, [isProcessing]);

    useEffect(() => {
        if (interrogation) {
            gsap.fromTo(interrogatePanelRef.current,
                { y: 100, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }
            );
        }
    }, [interrogation]);

    if (!isCalibrated) return null;

    const handleSubmit = async () => {
        if (!input.trim() || isProcessing) return;
        setIsProcessing(true);

        const response: any = await mockAiResponse(input);
        setIsProcessing(false);

        if (response.type === 'success') {
            addEntry(response.data);
            setInput('');
        } else if (response.type === 'clarification') {
            setInterrogation(response);
        }
    };

    const handleClarification = (option: string) => {
        // Dismiss panel
        gsap.to(interrogatePanelRef.current, {
            y: 100, opacity: 0, duration: 0.4, ease: 'power3.in',
            onComplete: () => setInterrogation(null)
        });

        // Auto-resolve mapped to the option
        setTimeout(() => {
            let data = { name: `Chips (${option})`, kcal: 200, protein: 2, carbs: 20, fat: 12 };
            if (option.includes('Large')) data = { name: `Large Chips`, kcal: 780, protein: 8, carbs: 85, fat: 45 };
            if (option.includes('Handful')) data = { name: `Handful of Chips`, kcal: 80, protein: 1, carbs: 8, fat: 5 };

            addEntry(data);
            setInput('');
        }, 400);
    };

    return (
        <div className="relative isolate px-4 pb-4">

            {/* The Interrogator Panel */}
            {interrogation && (
                <div ref={interrogatePanelRef} className="absolute bottom-full left-4 right-4 mb-4 z-10">
                    <div className="brutal-card p-4 bg-signal-red text-off-white shadow-xl">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-data text-xs uppercase tracking-widest opacity-80 flex items-center gap-2">
                                <Activity size={12} className="animate-pulse" /> Interrogation Required
                            </h3>
                            <button onClick={() => setInterrogation(null)} className="opacity-50 hover:opacity-100 transition-opacity">
                                <X size={16} />
                            </button>
                        </div>

                        <p className="font-sans text-lg mb-4">{interrogation.question}</p>

                        <div className="flex flex-wrap gap-2">
                            {interrogation.options.map((opt: string) => (
                                <button
                                    key={opt}
                                    onClick={() => handleClarification(opt)}
                                    className="bg-off-white text-signal-red px-3 py-1.5 rounded-full font-sans text-sm hover:scale-105 transition-transform"
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Input Matrix */}
            <div className={`brutal-card p-2 flex items-center shadow-[0_20px_50px_rgba(17,17,17,0.15)] bg-paper/90 backdrop-blur-xl border-t-white/50 transition-all ${isProcessing ? 'border-signal-red scale-[0.98]' : ''}`}>

                {/* Processing Laser Animation */}
                <div className="absolute top-0 left-0 w-full h-[2px] overflow-hidden rounded-t-[2rem] opacity-50">
                    <div
                        ref={scannerRef}
                        className="w-1/3 h-full bg-signal-red shadow-[0_0_10px_#E63B2E] translate-x-[-100%]"
                    />
                </div>

                <button className="p-3 text-brutal-black/50 hover:text-brutal-black transition-colors rounded-xl hover:bg-black/5 active:scale-95">
                    <Camera size={24} strokeWidth={1.5} />
                </button>

                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    placeholder="Log food... (e.g. 2 eggs)"
                    disabled={isProcessing}
                    className="flex-1 bg-transparent border-none outline-none px-4 font-sans text-lg placeholder:text-brutal-black/30 w-full min-w-0 disabled:opacity-50"
                />

                <button
                    onClick={handleSubmit}
                    className="btn-liquid p-3 rounded-full overflow-hidden shrink-0 flex items-center justify-center w-[48px] h-[48px] disabled:opacity-50 disabled:pointer-events-none group"
                    disabled={!input.trim() || isProcessing}
                >
                    {isProcessing ? (
                        <Activity size={20} className="relative z-10 animate-spin text-off-white" strokeWidth={2} />
                    ) : (
                        <Send size={20} className="relative z-10 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" strokeWidth={2} />
                    )}
                </button>
            </div>
        </div>
    );
};

export default SmartLogging;
