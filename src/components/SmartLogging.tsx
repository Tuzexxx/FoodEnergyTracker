import { useState, useRef, useEffect } from 'react';
import { Camera, Send, X, Activity, Image as ImageIcon } from 'lucide-react';
import gsap from 'gsap';
import { useStore } from '../store/useStore';
import { playSound } from '../utils/audio';

// Real AI Logic integrating with Vercel Serverless Function and Google Gemini
const getAiResponse = async (input: string, image?: string) => {
    try {
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input, image })
        });

        if (!res.ok) {
            console.error("API Error", await res.text());
            return { type: 'error' };
        }

        return await res.json();
    } catch (e) {
        console.error("Network Error", e);
        return { type: 'error' };
    }
};

const SmartLogging = () => {
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [interrogation, setInterrogation] = useState<any>(null);
    const { isCalibrated, addEntry } = useStore();

    const interrogatePanelRef = useRef(null);
    const scannerRef = useRef(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

        const response: any = await getAiResponse(input);
        setIsProcessing(false);

        if (response.type === 'success' && response.data) {
            playSound('log');
            addEntry(response.data);
            setInput('');
        } else if (response.type === 'clarification' && response.options) {
            playSound('error');
            setInterrogation({ ...response, originalInput: input });
        } else {
            playSound('error');
            console.error("Unhappy path hit:", response);
            alert("Telemetry connection failed or returned an unexpected format. Please try again.");
        }
    };

    const handleClarification = async (option: string) => {
        // Dismiss panel
        gsap.to(interrogatePanelRef.current, {
            y: 100, opacity: 0, duration: 0.4, ease: 'power3.in',
            onComplete: () => setInterrogation(null)
        });

        setIsProcessing(true);
        const resolvedInput = `${interrogation.originalInput} (${option})`;
        const response: any = await getAiResponse(resolvedInput);
        setIsProcessing(false);

        if (response.type === 'success') {
            playSound('log');
            addEntry(response.data);
            setInput('');
        } else {
            playSound('error');
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Image = reader.result as string;

            setIsProcessing(true);
            playSound('log');
            setInput(`Analyzing visual telemetry: ${file.name}...`);

            const response: any = await getAiResponse("Analyze this food image and estimate macros.", base64Image);

            setIsProcessing(false);
            if (response.type === 'success' && response.data) {
                playSound('targetHit');
                addEntry(response.data);
                setInput('');
            } else if (response.type === 'clarification' && response.options) {
                playSound('error');
                setInterrogation({ ...response, originalInput: "Analyze this food image" });
                setInput('');
            } else {
                playSound('error');
                setInput('');
                console.error("Image upload unhappy path hit:", response);
                alert("Visual telemetry connection failed or returned an unexpected format. Please try again.");
            }
        };
        reader.readAsDataURL(file);
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

                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                />

                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-brutal-black/50 hover:text-brutal-black transition-colors rounded-xl hover:bg-black/5 active:scale-95 flex items-center gap-1"
                    disabled={isProcessing}
                    title="Camera or Image Upload"
                >
                    <Camera size={20} strokeWidth={1.5} />
                    <span className="opacity-30 text-xs">/</span>
                    <ImageIcon size={20} strokeWidth={1.5} />
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
