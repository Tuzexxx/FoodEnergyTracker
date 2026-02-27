import { useState, useRef, useEffect } from 'react';
import { Camera, Send, X, Activity, Image as ImageIcon, Mic, Star } from 'lucide-react';
import gsap from 'gsap';
import { useStore } from '../store/useStore';
import { playSound } from '../utils/audio';
import { getAiResponse } from '../utils/ai';

const SmartLogging = () => {
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [interrogation, setInterrogation] = useState<any>(null);
    const { isCalibrated, addEntry, favorites } = useStore();

    const interrogatePanelRef = useRef(null);
    const scannerRef = useRef(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

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
        // Dismiss current panel visually first
        gsap.to(interrogatePanelRef.current, {
            y: 100, opacity: 0, duration: 0.4, ease: 'power3.in',
            onComplete: () => setInterrogation(null)
        });

        setIsProcessing(true);
        const resolvedInput = `${interrogation.originalInput} (${option})`;
        const response: any = await getAiResponse(resolvedInput);
        setIsProcessing(false);

        if (response.type === 'success' && response.data) {
            if (response.data.requiresReview) {
                playSound('error'); // Play softer notification sound for assumptions
            } else {
                playSound('log'); // Play solid success sound for confident logs
            }
            addEntry(response.data);
            setInput('');
        } else if (response.type === 'clarification' && response.options) {
            // AI still needs more info (e.g. "salad (100g)" -> "What kind of salad?")
            playSound('error');
            setInterrogation({ ...response, originalInput: resolvedInput });
        } else {
            playSound('error');
            console.error("Clarification unhappy path hit:", response);
            alert("Telemetry connection failed or returned an unexpected format during interrogation. Please try again.");
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Display "Processing" state immediately
        setIsProcessing(true);
        playSound('log');
        setInput(`Compressing & analyzing visual telemetry...`);

        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.onload = async () => {
                // Compression logic to prevent Vercel 413 "Payload Too Large"
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_DIMENSION = 1000;

                if (width > height) {
                    if (width > MAX_DIMENSION) {
                        height *= MAX_DIMENSION / width;
                        width = MAX_DIMENSION;
                    }
                } else {
                    if (height > MAX_DIMENSION) {
                        width *= MAX_DIMENSION / height;
                        height = MAX_DIMENSION;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // Compress to highly efficient JPEG (Gemini handles this perfectly)
                const base64Image = canvas.toDataURL('image/jpeg', 0.8);

                try {
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
                        throw new Error("Unexpected format");
                    }
                } catch (error) {
                    setIsProcessing(false);
                    playSound('error');
                    setInput('');
                    console.error("Image upload unhappy path hit:", error);
                    alert("Visual telemetry connection failed or returned an unexpected format. Please try again.");
                }
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);

        // Clear the file input so the same file can be selected again if needed
        e.target.value = '';
    };

    const startDictation = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Váš prohlížeč nepodporuje rozpoznávání hlasu.");
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'cs-CZ';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => setIsProcessing(true);
        recognition.onend = () => setIsProcessing(false);

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput((prev) => prev ? prev + ' ' + transcript : transcript);
            playSound('log');
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsProcessing(false);
        };

        recognition.start();
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

            {/* Native Camera Capture Input */}
            <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={cameraInputRef}
                onChange={handleImageUpload}
            />

            {/* Photo Gallery Selection Input */}
            <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={galleryInputRef}
                onChange={handleImageUpload}
            />

            {/* Favorites List */}
            {favorites && favorites.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar px-1">
                    {(favorites || []).map((fav, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                setInput((prev) => prev ? prev + ', ' + fav.name : fav.name);
                                playSound('click');
                            }}
                            className="bg-black/5 text-brutal-black px-4 py-2 rounded-full font-sans text-sm whitespace-nowrap hover:bg-black/10 transition-colors flex items-center gap-1 shrink-0 border border-black/5 shadow-sm"
                        >
                            <Star size={14} className="text-brutal-black/50" /> {fav.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Main Input Container */}
            <div className="flex gap-2 items-end">
                {/* Tools - Outside the text box completely left */}
                <div className="flex flex-col gap-2 shrink-0">
                    <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="p-3 bg-paper shadow-md rounded-2xl text-brutal-black/60 hover:text-brutal-black transition-all hover:bg-black/5 active:scale-95 border border-black/5"
                        disabled={isProcessing}
                        title="Take Photo"
                    >
                        <Camera size={22} strokeWidth={1.5} />
                    </button>
                    <button
                        onClick={() => galleryInputRef.current?.click()}
                        className="p-3 bg-paper shadow-md rounded-2xl text-brutal-black/60 hover:text-brutal-black transition-all hover:bg-black/5 active:scale-95 border border-black/5"
                        disabled={isProcessing}
                        title="Upload from Gallery"
                    >
                        <ImageIcon size={22} strokeWidth={1.5} />
                    </button>
                    <button
                        onClick={startDictation}
                        className="p-3 bg-paper shadow-md rounded-2xl text-signal-red/80 hover:text-signal-red transition-all hover:bg-signal-red/10 active:scale-95 border border-signal-red/20"
                        disabled={isProcessing}
                        title="Voice Dictation"
                    >
                        {isProcessing ? <Activity size={22} className="animate-spin" /> : <Mic size={22} strokeWidth={1.5} />}
                    </button>
                </div>

                {/* Text Box Matrix */}
                <div className={`brutal-card p-1 flex-1 flex flex-col shadow-[0_20px_50px_rgba(17,17,17,0.15)] bg-paper/90 backdrop-blur-xl border-t-white/50 transition-all relative ${isProcessing ? 'border-signal-red scale-[0.98]' : 'border border-black/5'}`}>
                    {/* Processing Laser Animation */}
                    <div className="absolute top-0 left-0 w-full h-[2px] overflow-hidden rounded-t-[2rem] opacity-50">
                        <div
                            ref={scannerRef}
                            className="w-1/3 h-full bg-signal-red shadow-[0_0_10px_#E63B2E] translate-x-[-100%]"
                        />
                    </div>

                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        placeholder="Log food... (e.g. 2 eggs)"
                        disabled={isProcessing}
                        rows={3}
                        className="bg-transparent border-none outline-none px-3 py-3 font-sans text-lg placeholder:text-brutal-black/30 w-full resize-none disabled:opacity-50"
                    />

                    <div className="flex justify-end p-1">
                        <button
                            onClick={handleSubmit}
                            className="btn-liquid p-2 rounded-full overflow-hidden shrink-0 flex items-center justify-center w-[44px] h-[44px] disabled:opacity-50 disabled:pointer-events-none group"
                            disabled={!input.trim() || isProcessing}
                        >
                            {isProcessing ? (
                                <Activity size={18} className="relative z-10 animate-spin text-off-white" strokeWidth={2} />
                            ) : (
                                <Send size={18} className="relative z-10 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" strokeWidth={2} />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmartLogging;
