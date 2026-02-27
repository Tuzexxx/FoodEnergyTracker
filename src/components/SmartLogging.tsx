import { useState, useRef, useEffect } from 'react';
import { Camera, Send, X, Activity, Image as ImageIcon, Mic, Star } from 'lucide-react';
import gsap from 'gsap';
import { useStore } from '../store/useStore';
import { playSound } from '../utils/audio';
import { getAiResponse } from '../utils/ai';

const SmartLogging = () => {
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [showFavorites, setShowFavorites] = useState(false);
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
            alert("Your browser does not support voice recognition.");
            return;
        }
        const recognition = new SpeechRecognition();
        // Removed hardcoded recognition.lang = 'cs-CZ' to allow browser default / multi-language support.
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
        <div className="relative isolate flex flex-col items-center">
            {/* The Interrogator Panel */}
            {interrogation && (
                <div ref={interrogatePanelRef} className="absolute bottom-full mb-4 w-full px-2 z-10">
                    <div className="p-5 rounded-3xl bg-orange-500/90 backdrop-blur-xl text-off-white shadow-xl shadow-orange-500/20 border border-white/20">
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="font-sans font-semibold text-xs tracking-wider uppercase opacity-90 flex items-center gap-2">
                                <Activity size={12} className="animate-pulse" /> Interrogation Required
                            </h3>
                            <button onClick={() => setInterrogation(null)} className="opacity-60 hover:opacity-100 transition-opacity p-1 bg-black/10 rounded-full">
                                <X size={14} />
                            </button>
                        </div>

                        <p className="font-sans font-medium text-lg leading-tight mb-4">{interrogation.question}</p>

                        <div className="flex flex-wrap gap-2">
                            {interrogation.options.map((opt: string) => (
                                <button
                                    key={opt}
                                    onClick={() => handleClarification(opt)}
                                    className="bg-white text-orange-600 px-4 py-2 rounded-2xl font-sans font-medium text-sm hover:scale-95 active:scale-90 shadow-sm transition-all"
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Native Camera Capture Input */}
            <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={handleImageUpload} />
            {/* Photo Gallery Selection Input */}
            <input type="file" accept="image/*" className="hidden" ref={galleryInputRef} onChange={handleImageUpload} />

            {/* Favorites List - Floating above the pill */}
            {showFavorites && favorites && favorites.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar px-2 w-full max-w-sm animate-in fade-in slide-in-from-bottom-2">
                    {(favorites || []).map((fav, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                setInput((prev) => prev ? prev + ', ' + fav.name : fav.name);
                                setShowFavorites(false);
                                playSound('click');
                            }}
                            className="bg-white/80 backdrop-blur-md text-brutal-black px-4 py-2 rounded-2xl font-sans text-sm font-medium whitespace-nowrap hover:bg-white active:scale-95 transition-all flex items-center gap-1.5 shrink-0 border border-black/5 shadow-sm"
                        >
                            <Star size={14} className="text-amber-400 fill-amber-400" /> {fav.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Main Interactive Pill Container */}
            <div className={`p-1.5 flex flex-col w-full shadow-[0_10px_40px_rgba(0,0,0,0.15)] bg-white/85 backdrop-blur-2xl transition-all relative rounded-3xl z-40
                ${isFocused || input.trim().length > 0 ? 'rounded-[2rem] border-white/80' : 'rounded-full border-white/60'} 
                ${isProcessing ? 'border-indigo-400 scale-[0.98]' : 'border'}`}>

                {/* Processing Laser Animation */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-[inherit] pointer-events-none opacity-50 z-0">
                    <div ref={scannerRef} className="w-1/3 h-full bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent translate-x-[-100%]" />
                </div>

                <div className="flex gap-1 items-end relative z-10 w-full">
                    {/* Tool Bar inside the Pill */}
                    <div className="flex items-center gap-1 shrink-0 p-1">
                        <button
                            onClick={() => cameraInputRef.current?.click()}
                            className="w-10 h-10 flex items-center justify-center rounded-full text-brutal-black/50 hover:text-indigo-600 transition-all hover:bg-black/5 active:scale-90"
                            disabled={isProcessing} title="Take Photo"
                        >
                            <Camera size={20} strokeWidth={2} />
                        </button>
                        <button
                            onClick={() => galleryInputRef.current?.click()}
                            className="w-10 h-10 flex items-center justify-center rounded-full text-brutal-black/50 hover:text-indigo-600 transition-all hover:bg-black/5 active:scale-90"
                            disabled={isProcessing} title="Upload from Gallery"
                        >
                            <ImageIcon size={20} strokeWidth={2} />
                        </button>
                        <button
                            onClick={startDictation}
                            className="w-10 h-10 flex items-center justify-center rounded-full text-red-500 hover:text-white transition-all hover:bg-red-500 active:scale-90"
                            disabled={isProcessing} title="Voice Dictation"
                        >
                            {isProcessing ? <Activity size={20} className="animate-spin" /> : <Mic size={20} strokeWidth={2} />}
                        </button>
                        {favorites && favorites.length > 0 && (
                            <button
                                onClick={() => setShowFavorites(!showFavorites)}
                                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 ${showFavorites ? 'text-amber-500 bg-amber-50' : 'text-amber-400 hover:text-amber-500 hover:bg-amber-50'}`}
                                title="Toggle Favorites"
                            >
                                <Star size={20} strokeWidth={2} fill={showFavorites ? 'currentColor' : 'none'} />
                            </button>
                        )}
                    </div>

                    {/* Fluid Text Area */}
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        placeholder="Log food... (e.g. eggs)"
                        disabled={isProcessing}
                        rows={isFocused || input.trim().length > 0 ? 3 : 1}
                        className={`bg-transparent border-none outline-none font-sans text-[17px] leading-snug placeholder:text-brutal-black/30 w-full resize-none disabled:opacity-50 transition-all duration-300 ease-spring scrollbar-hide
                            ${isFocused || input.trim().length > 0 ? 'py-3 px-2 min-h-[72px]' : 'py-3.5 px-2 min-h-[44px]'}`}
                    />

                    {/* Submit Button */}
                    <div className="flex items-end justify-end p-1 shrink-0">
                        <button
                            onClick={handleSubmit}
                            className="bg-indigo-600 text-white rounded-full overflow-hidden shrink-0 flex items-center justify-center w-10 h-10 disabled:opacity-40 disabled:pointer-events-none group active:scale-95 transition-all shadow-md shadow-indigo-600/20"
                            disabled={!input.trim() || isProcessing}
                        >
                            {isProcessing ? (
                                <Activity size={18} className="animate-spin" strokeWidth={2.5} />
                            ) : (
                                <Send size={18} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 -ml-0.5 mt-0.5" strokeWidth={2.5} />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SmartLogging;
