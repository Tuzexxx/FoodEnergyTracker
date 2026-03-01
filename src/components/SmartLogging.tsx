import { useState, useRef, useEffect } from 'react';
import { Camera, Send, X, Activity, Image as ImageIcon, Mic, Star, Edit2, Trash2 } from 'lucide-react';
import gsap from 'gsap';
import { useStore } from '../store/useStore';
import { playSound } from '../utils/audio';
import { getAiResponse } from '../utils/ai';

const SmartLogging = () => {
    const [input, setInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [showFavorites, setShowFavorites] = useState(false);
    const [isFavEditMode, setIsFavEditMode] = useState(false);
    const [editingFav, setEditingFav] = useState<any>(null);
    const [isFavAdjusting, setIsFavAdjusting] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [interrogation, setInterrogation] = useState<any>(null);
    const { isCalibrated, addEntry, favorites, removeFavorite, updateFavorite, processingLogs, addProcessingLog, removeProcessingLog } = useStore();

    // Only lock the SmartLogging UI if actively recording voice dictation
    const isProcessing = processingLogs.some(log => log.type === 'voice');

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
        if (!input.trim() && !selectedImage) return;

        const currentInput = input;
        const currentImage = selectedImage;
        const tempId = Math.random().toString(36).substring(7);

        // Clear UI instantly for parallel logging
        setInput('');
        setSelectedImage(null);
        setIsFocused(false);

        // Add to global processing queue
        addProcessingLog({
            id: tempId,
            text: currentImage ? (currentInput || 'Analyzing image...') : currentInput,
            type: currentImage ? 'image' : 'text'
        });

        // Background AI processing
        try {
            const prompt = currentInput || (currentImage ? "Analyze this food image and estimate macros." : "Log this food.");
            const response: any = await getAiResponse(prompt, currentImage || undefined);

            if (response.type === 'success' && response.data) {
                playSound('log');
                addEntry(response.data);
            } else if (response.type === 'clarification' && response.options) {
                playSound('error');
                setInterrogation({ ...response, originalInput: prompt, originalImage: currentImage });
            } else {
                playSound('error');
                console.error("Unhappy path hit:", response);
                alert("Telemetry connection failed or returned an unexpected format.");
            }
        } catch (error) {
            playSound('error');
            console.error("Unhappy path hit:", error);
        } finally {
            removeProcessingLog(tempId);
        }
    };

    const handleClarification = async (option: string) => {
        // Dismiss current panel visually first
        gsap.to(interrogatePanelRef.current, {
            y: 100, opacity: 0, duration: 0.4, ease: 'power3.in',
            onComplete: () => setInterrogation(null)
        });

        const tempId = Math.random().toString(36).substring(7);
        const resolvedInput = `${interrogation.originalInput} (${option})`;
        const originalImage = interrogation.originalImage;

        addProcessingLog({
            id: tempId,
            text: `Clarifying: ${resolvedInput}`,
            type: originalImage ? 'image' : 'text'
        });

        try {
            const response: any = await getAiResponse(resolvedInput, originalImage || undefined);

            if (response.type === 'success' && response.data) {
                if (response.data.requiresReview) {
                    playSound('error');
                } else {
                    playSound('log');
                }
                addEntry(response.data);
            } else if (response.type === 'clarification' && response.options) {
                playSound('error');
                setInterrogation({ ...response, originalInput: resolvedInput, originalImage });
            } else {
                playSound('error');
                console.error("Clarification unhappy path hit:", response);
                alert("Telemetry connection failed or returned an unexpected format during interrogation.");
            }
        } catch (e) {
            console.error(e);
        } finally {
            removeProcessingLog(tempId);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        playSound('log');
        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.onload = async () => {
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

                const base64Image = canvas.toDataURL('image/jpeg', 0.8);
                setSelectedImage(base64Image);
                setIsFocused(true); // Open the box
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
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

        const tempId = Math.random().toString(36).substring(7);
        recognition.onstart = () => {
            addProcessingLog({ id: tempId, text: 'Listening...', type: 'voice' });
        };
        recognition.onend = () => {
            removeProcessingLog(tempId);
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput((prev) => prev ? prev + ' ' + transcript : transcript);
            playSound('log');
            setIsFocused(true);
        };

        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            removeProcessingLog(tempId);
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

            {/* Frosted Glass Backdrop */}
            {showFavorites && favorites && favorites.length > 0 && (
                <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-xl" onClick={() => { setShowFavorites(false); setIsFavEditMode(false); setEditingFav(null); }} />
            )}

            {/* Favorites List - Floating above the pill */}
            {showFavorites && favorites && favorites.length > 0 && (
                <div className="flex flex-col gap-2 pb-4 mb-2 px-2 w-full max-w-sm mx-auto items-center animate-in fade-in slide-in-from-bottom-2 relative z-40">
                    {/* Frosted Glass Panel */}
                    <div className="w-full bg-white/40 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-2xl p-4">
                        {/* Edit Toggle Header */}
                        <div className="flex justify-end w-full mb-3">
                            <button
                                onClick={() => {
                                    setIsFavEditMode(!isFavEditMode);
                                    setEditingFav(null);
                                }}
                                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md transition-all ${isFavEditMode ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30' : 'bg-black/5 text-brutal-black/50 hover:bg-black/10'}`}
                            >
                                <Edit2 size={12} /> {isFavEditMode ? 'Done' : 'Edit'}
                            </button>
                        </div>

                        <div className="flex flex-wrap justify-center gap-2 w-full">
                            {(favorites || []).map((fav, i) => {
                                const isEditingThis = editingFav?.originalName === fav.name;

                                if (isEditingThis) {
                                    return (
                                        <div key={`edit-${i}`} className="bg-white/60 backdrop-blur-2xl flex flex-col gap-3 p-3 rounded-2xl w-full border border-white/40 shadow-2xl z-50 animate-in zoom-in-95 data-[state=closed]:zoom-out-95 duration-200">
                                            <input
                                                type="text"
                                                value={editingFav.name}
                                                onChange={(e) => setEditingFav({ ...editingFav, name: e.target.value })}
                                                className="w-full bg-black/5 rounded-lg px-3 py-2 text-sm font-bold font-sans outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-black/30"
                                                placeholder="Name (e.g., *Salad* 300g)"
                                            />
                                            <div className="flex gap-2">
                                                <div className="flex-1 flex flex-col">
                                                    <label className="text-[10px] uppercase font-bold text-black/40 mb-1 tracking-wider">KCAL</label>
                                                    <input
                                                        type="number"
                                                        value={editingFav.kcal}
                                                        onChange={(e) => setEditingFav({ ...editingFav, kcal: Number(e.target.value) })}
                                                        className="w-full bg-black/5 rounded-lg px-3 py-2 text-sm font-bold font-data text-signal-red outline-none focus:ring-2 focus:ring-signal-red"
                                                    />
                                                </div>
                                                <div className="flex-1 flex flex-col">
                                                    <label className="text-[10px] uppercase font-bold text-black/40 mb-1 tracking-wider">PROTEIN</label>
                                                    <input
                                                        type="number"
                                                        value={editingFav.protein}
                                                        onChange={(e) => setEditingFav({ ...editingFav, protein: Number(e.target.value) })}
                                                        className="w-full bg-black/5 rounded-lg px-3 py-2 text-sm font-bold font-data text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-600"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center mt-1 border-t border-black/5 pt-2">
                                                <button
                                                    onClick={() => {
                                                        removeFavorite(fav.name);
                                                        setEditingFav(null);
                                                        if (favorites.length === 1) setShowFavorites(false);
                                                    }}
                                                    className="flex items-center justify-center w-10 h-10 rounded-full text-red-500 bg-red-50 hover:bg-red-500 hover:text-white transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setEditingFav(null)}
                                                        className="px-3 py-2 rounded-xl text-[10px] font-bold uppercase bg-black/5 hover:bg-black/10 transition-all active:scale-95"
                                                        disabled={isFavAdjusting}
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const { originalName, ...toSave } = editingFav;
                                                            updateFavorite(originalName, toSave);
                                                            setEditingFav(null);
                                                        }}
                                                        className="px-3 py-2 bg-black/80 text-white rounded-xl hover:bg-black text-[10px] uppercase font-bold tracking-wider transition-colors disabled:opacity-50"
                                                        disabled={isFavAdjusting}
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        title="Recalculate Macros"
                                                        onClick={async () => {
                                                            setIsFavAdjusting(true);
                                                            const aiRes: any = await getAiResponse(editingFav.name);
                                                            setIsFavAdjusting(false);
                                                            if (aiRes.type === 'success' && aiRes.data) {
                                                                const { originalName } = editingFav;
                                                                updateFavorite(originalName, {
                                                                    name: aiRes.data.name || editingFav.name,
                                                                    kcal: aiRes.data.kcal,
                                                                    protein: aiRes.data.protein,
                                                                    carbs: aiRes.data.carbs,
                                                                    fat: aiRes.data.fat
                                                                });
                                                                setEditingFav(null);
                                                            } else {
                                                                alert("AI could not adjust. Please edit manually.");
                                                            }
                                                        }}
                                                        disabled={isFavAdjusting}
                                                        className="px-3 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-[10px] uppercase font-bold tracking-wider transition-colors disabled:opacity-50 flex items-center gap-1"
                                                    >
                                                        {isFavAdjusting ? <Activity size={14} className="animate-spin" /> : <Activity size={14} />} Auto-Adjust
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            if (isFavEditMode) {
                                                setEditingFav({ originalName: fav.name, ...fav });
                                            } else {
                                                addEntry({
                                                    name: fav.name,
                                                    kcal: fav.kcal,
                                                    protein: fav.protein,
                                                    carbs: fav.carbs,
                                                    fat: fav.fat,
                                                    requiresReview: false
                                                });
                                                setShowFavorites(false);
                                                playSound('targetHit');
                                            }
                                        }}
                                        className={`bg-white/80 backdrop-blur-md text-brutal-black px-3 py-2 rounded-full font-sans text-sm font-medium hover:bg-white transition-all flex items-center gap-2 w-max max-w-full border border-black/5 shadow-sm
                                            ${isFavEditMode ? 'animate-pulse bg-indigo-50/90 border-indigo-200 shadow-indigo-200 group' : 'active:scale-95'}`}
                                    >
                                        <div className="flex items-center gap-1.5 truncate min-w-0 pr-1">
                                            {isFavEditMode ? (
                                                <Edit2 size={14} className="text-indigo-500 shrink-0 group-hover:scale-110 transition-transform" />
                                            ) : (
                                                <Star size={14} className="text-amber-400 fill-amber-400 shrink-0" />
                                            )}
                                            <span className="font-bold truncate">{fav.name.match(/^\*([^*]+)\*/)?.[1] ?? fav.name.split('||')[0]}</span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <span className="text-[9px] font-bold uppercase opacity-60 bg-black/5 px-1.5 py-0.5 rounded">
                                                {fav.kcal} kcal
                                            </span>
                                            <span className="text-[9px] font-bold uppercase opacity-60 bg-black/5 px-1.5 py-0.5 rounded">
                                                {fav.protein}g prot
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Interactive Pill Container */}
            <div className={`p-2 flex flex-col w-full shadow-[0_10px_40px_rgba(0,0,0,0.15)] bg-white/85 backdrop-blur-2xl transition-all relative rounded-3xl z-40 border
                ${isProcessing ? 'border-indigo-400 scale-[0.98]' : 'border-white/80'}`}>

                {/* Processing Laser Animation */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-[inherit] pointer-events-none opacity-50 z-0">
                    <div ref={scannerRef} className="w-1/3 h-full bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent translate-x-[-100%]" />
                </div>

                <div className="flex flex-col relative z-10 w-full">
                    {/* Tool Bar Stacked Above */}
                    <div className="flex items-center gap-1 px-1 border-b border-black/5 pb-2 mb-1">
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
                        <div className="w-[1px] h-6 bg-black/10 mx-1"></div>
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

                    {/* Selected Image Thumbnail */}
                    {selectedImage && (
                        <div className="px-3 pb-2 pt-2 w-full animate-in fade-in zoom-in slide-in-from-bottom-2">
                            <div className="relative inline-block">
                                <img src={selectedImage} alt="Upload preview" className="h-16 w-16 object-cover rounded-xl border-2 border-indigo-200 shadow-sm" />
                                <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 active:scale-95 transition-all outline-none">
                                    <X size={12} strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Bottom Row: Input & Submit */}
                    <div className="flex gap-2 items-end w-full px-1">
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
                            placeholder={selectedImage ? "Add a comment about the photo..." : "Log food... (e.g. eggs)"}
                            rows={isFocused || input.trim().length > 0 || selectedImage ? 3 : 1}
                            className={`bg-transparent border-none outline-none font-sans text-[17px] leading-snug placeholder:text-brutal-black/30 w-full resize-none transition-all duration-300 ease-spring scrollbar-hide py-2 px-1
                                ${isFocused || input.trim().length > 0 || selectedImage ? 'min-h-[76px]' : 'min-h-[28px]'}`}
                        />

                        {/* Submit Button */}
                        <div className="flex items-end justify-end pb-1.5 pr-1 shrink-0">
                            <button
                                onClick={handleSubmit}
                                className="bg-indigo-600 text-white rounded-full overflow-hidden shrink-0 flex items-center justify-center w-10 h-10 disabled:opacity-40 disabled:pointer-events-none group active:scale-95 transition-all shadow-md shadow-indigo-600/20"
                                disabled={(!input.trim() && !selectedImage)}
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
        </div>
    );
};

export default SmartLogging;
