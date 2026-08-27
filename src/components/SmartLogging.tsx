import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Send, X, Activity, LayoutGrid, Star, Edit2, Trash2, Mic, Image as ImageIcon } from 'lucide-react';
import BatchUpload from './BatchUpload';
import gsap from 'gsap';
import { useStore } from '../store/useStore';
import { playSound } from '../utils/audio';
import { getAiResponse } from '../utils/ai';
import { savePending, removePending, getAllPending } from '../utils/pendingQueue';

const SmartLogging = () => {
    const [input, setInput] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [showFavorites, setShowFavorites] = useState(false);
    const [isFavEditMode, setIsFavEditMode] = useState(false);
    const [editingFav, setEditingFav] = useState<any>(null);
    const [isFavAdjusting, setIsFavAdjusting] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showCameraPicker, setShowCameraPicker] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isBatchOpen, setIsBatchOpen] = useState(false);
    const [interrogation, setInterrogation] = useState<any>(null);
    const [telemetryError, setTelemetryError] = useState<string | null>(null);
    const { isCalibrated, session, addEntry, favorites, removeFavorite, updateFavorite, processingLogs, addProcessingLog, removeProcessingLog, clearProcessingLogs } = useStore();

    // Only lock the SmartLogging UI if actively recording voice dictation
    const isProcessing = processingLogs.some(log => log.type === 'voice');

    const interrogatePanelRef = useRef(null);
    const scannerRef = useRef(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const recognitionRef = useRef<any>(null);
    const inFlightRequestsRef = useRef(new Set<string>());
    const queueScope = session?.user.id ?? 'guest';

    // --- Voice Dictation (Web Speech API) ---
    const toggleListening = () => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice speech recognition is not supported in this browser. Please try Google Chrome or Safari.");
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            return;
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = navigator.language || 'cs-CZ';

            recognition.onstart = () => {
                setIsListening(true);
                playSound('click');
            };

            recognition.onresult = (event: any) => {
                const transcript = Array.from(event.results)
                    .map((result: any) => (result as any)[0].transcript)
                    .join('');
                setInput(transcript);
            };

            recognition.onerror = (event: any) => {
                console.warn("Speech recognition error:", event.error);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            console.error("Speech recognition startup error:", err);
            setIsListening(false);
        }
    };


    // --- Background Queue: process a single pending item ---
    const processRequest = useCallback(async (id: string, prompt: string, image?: string, isRetry = false) => {
        if (inFlightRequestsRef.current.has(id)) return;
        inFlightRequestsRef.current.add(id);

        try {
            const response: any = await getAiResponse(prompt, image || undefined);

            if (response.type === 'success' && response.data) {
                await removePending(id);
                const currentScope = useStore.getState().session?.user.id ?? 'guest';
                if (currentScope !== queueScope) return;
                if (!isRetry) playSound('log');
                addEntry(response.data);
            } else if (response.type === 'clarification' && response.options) {
                await removePending(id);
                if (!isRetry) {
                    playSound('error');
                    setInterrogation({ ...response, originalInput: prompt, originalImage: image });
                }
            } else if (response.retryable) {
                // Keep transient failures in IndexedDB so the next visibility event can retry them.
                if (!isRetry) {
                    setTelemetryError(response.error || "Telemetry analysis failed. It will retry when the app resumes.");
                    setTimeout(() => setTelemetryError(null), 10_000);
                }
            } else {
                // Non-recoverable error — remove from queue to avoid infinite retries
                await removePending(id);
                if (!isRetry) {
                    playSound('error');
                    setTelemetryError(response.error || "Telemetry analysis failed. Please try again.");
                    setTimeout(() => setTelemetryError(null), 10_000);
                }
            }
        } catch (error) {
            // Recoverable error (network/abort) — leave in IndexedDB for retry
            console.warn(`Request ${id} failed, will retry on resume`, error);
            if (!isRetry) playSound('error');
        } finally {
            inFlightRequestsRef.current.delete(id);
            removeProcessingLog(id);
        }
    }, [addEntry, removeProcessingLog, queueScope]);

    // --- Retry pending items when the app resumes (screen unlock / tab focus) ---
    const retryPending = useCallback(async () => {
        const pending = await getAllPending(queueScope);
        if (pending.length === 0) return;
        console.log(`[PendingQueue] Retrying ${pending.length} item(s)`);

        for (const item of pending) {
            addProcessingLog({ id: item.id, text: item.input || 'Retrying...', type: item.image ? 'image' : 'text' });
            processRequest(item.id, item.input, item.image, true);
        }
    }, [addProcessingLog, processRequest, queueScope]);

    // Wipe stale UI processing entries + retry any IndexedDB pending items on mount
    useEffect(() => {
        clearProcessingLogs();
        retryPending();
    }, [clearProcessingLogs, retryPending]);

    // Listen for visibility change to retry pending items when app resumes
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                retryPending();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [retryPending]);

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
        const tempId = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).substring(2);

        // Clear UI instantly for parallel logging
        setInput('');
        setSelectedImage(null);
        setIsFocused(false);

        const prompt = currentInput || (currentImage ? "Analyze this food image and estimate macros." : "Log this food.");

        // 1. Persist to IndexedDB BEFORE sending — survives screen-lock
        try {
            await savePending(tempId, prompt, currentImage || undefined, queueScope);
        } catch (err) {
            console.warn('IndexedDB save failed. Continuing without persistence.', err);
        }

        // 2. Add to visual processing queue
        addProcessingLog({
            id: tempId,
            text: currentImage ? (currentInput || 'Analyzing image...') : currentInput,
            type: currentImage ? 'image' : 'text'
        });

        // 3. Fire the request (processRequest handles success/failure/retry)
        processRequest(tempId, prompt, currentImage || undefined);
    };

    // Animate-out and dismiss the interrogation panel
    const dismissInterrogation = () => {
        gsap.to(interrogatePanelRef.current, {
            y: 100, opacity: 0, duration: 0.3, ease: 'power3.in',
            onComplete: () => setInterrogation(null)
        });
    };

    const handleClarification = async (option: string) => {
        const currentInterrogation = interrogation; // capture before dismissing
        dismissInterrogation();

        const tempId = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).substring(2);
        const resolvedInput = `${currentInterrogation.originalInput} (${option})`;
        const originalImage = currentInterrogation.originalImage;

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
                // Error path — just drop silently, don't leave any stuck UI
                playSound('error');
                console.error('Clarification unhappy path:', response);
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
                setShowCameraPicker(false);
                setIsFocused(true); // Open the box

                // If taken directly via camera input, auto-save to device gallery/downloads
                if (e.target === cameraInputRef.current) {
                    try {
                        const a = document.createElement('a');
                        a.href = base64Image;
                        a.download = `food_${Date.now()}.jpg`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    } catch (err) {
                        console.warn("Could not trigger gallery save:", err);
                    }
                }
            };
            img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
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
                            <button onClick={dismissInterrogation} className="opacity-60 hover:opacity-100 transition-opacity p-1 bg-black/10 rounded-full">
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

            {/* Native Camera Capture Input (Direct Camera, saves to local camera roll) */}
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

            {/* Unified Camera Choice Modal */}
            {showCameraPicker && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setShowCameraPicker(false)}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm bg-white text-brutal-black border-2 border-brutal-black rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-brutal-black/70">
                                Add Food Photo
                            </h3>
                            <button
                                onClick={() => setShowCameraPicker(false)}
                                className="p-1 hover:bg-black/5 rounded-full"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            {/* 1. Direct Live Camera */}
                            <button
                                onClick={() => {
                                    setShowCameraPicker(false);
                                    cameraInputRef.current?.click();
                                }}
                                className="flex items-center gap-3 w-full p-3.5 bg-black/5 hover:bg-black/10 rounded-2xl font-sans font-bold text-sm transition-all active:scale-98 text-left"
                            >
                                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm">
                                    <Camera size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-brutal-black font-semibold">Take Live Photo</span>
                                    <span className="text-[11px] font-normal opacity-50">Direct camera & saves to device gallery</span>
                                </div>
                            </button>

                            {/* 2. Choose from Library */}
                            <button
                                onClick={() => {
                                    setShowCameraPicker(false);
                                    galleryInputRef.current?.click();
                                }}
                                className="flex items-center gap-3 w-full p-3.5 bg-black/5 hover:bg-black/10 rounded-2xl font-sans font-bold text-sm transition-all active:scale-98 text-left"
                            >
                                <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-sm">
                                    <ImageIcon size={18} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-brutal-black font-semibold">Choose from Gallery</span>
                                    <span className="text-[11px] font-normal opacity-50">Select from already taken photos</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

                        <div className="flex flex-col gap-2 w-full max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
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
                                                placeholder="Name (e.g., *Salad* with dressing)"
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
                                            <div className="flex flex-wrap justify-between items-center mt-1 border-t border-black/5 pt-2 gap-2">
                                                <button
                                                    onClick={() => {
                                                        removeFavorite(fav.name);
                                                        setEditingFav(null);
                                                        if (favorites.length === 1) setShowFavorites(false);
                                                    }}
                                                    className="flex items-center justify-center w-10 h-10 rounded-full text-red-500 bg-red-50 hover:bg-red-500 hover:text-white transition-all shrink-0"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <div className="flex gap-1.5 flex-1 justify-end min-w-fit">
                                                    <button
                                                        onClick={() => setEditingFav(null)}
                                                        className="px-2.5 py-2 rounded-xl text-[10px] font-bold uppercase bg-black/5 hover:bg-black/10 transition-all active:scale-95 shrink-0"
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
                                                        className="px-3 py-2 bg-black/80 text-white rounded-xl hover:bg-black text-[10px] uppercase font-bold tracking-wider transition-colors disabled:opacity-50 shrink-0"
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
                                                        className="px-2.5 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-[10px] uppercase font-bold tracking-wider transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0"
                                                    >
                                                        {isFavAdjusting ? <Activity size={14} className="animate-spin" /> : <Activity size={14} />} <span>Adjust</span>
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
                                                let editName = fav.name;
                                                // Convert legacy || to *Title* for the edit input
                                                if (fav.name.includes('||')) {
                                                    const [title, ...rest] = fav.name.split('||');
                                                    editName = `*${title.trim()}* ${rest.join(' ').trim()}`;
                                                }
                                                setEditingFav({ originalName: fav.name, ...fav, name: editName });
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
                                        className={`bg-white/80 backdrop-blur-md text-brutal-black px-4 py-3 rounded-2xl font-sans text-sm font-medium hover:bg-white transition-all flex items-center justify-between gap-2 w-full border border-black/5 shadow-sm
                                            ${isFavEditMode ? 'animate-pulse bg-indigo-50/90 border-indigo-200 shadow-indigo-200 group' : 'active:scale-[0.98]'}`}
                                    >
                                        <div className="flex items-center gap-1.5 truncate min-w-0 pr-1">
                                            {isFavEditMode ? (
                                                <Edit2 size={14} className="text-indigo-500 shrink-0 group-hover:scale-110 transition-transform" />
                                            ) : (
                                                <Star size={14} className="text-amber-400 fill-amber-400 shrink-0" />
                                            )}
                                            <span className="font-bold truncate">
                                                {(() => {
                                                    const starMatch = fav.name.match(/^\*([^*]+)\*/);
                                                    if (starMatch) return starMatch[1];
                                                    if (fav.name.includes('||')) return fav.name.split('||')[0].trim();
                                                    return fav.name;
                                                })()}
                                            </span>
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

            {telemetryError && (
                <div className="absolute bottom-[110%] w-full z-50 bg-red-500/10 backdrop-blur-md border border-red-500/20 text-red-600 p-3 rounded-2xl text-xs font-bold font-mono animate-in fade-in slide-in-from-bottom-2 flex items-center gap-2 mb-2 shadow-sm">
                    <Activity size={14} className="animate-pulse shrink-0" />
                    <span>{telemetryError}</span>
                    <button onClick={() => setTelemetryError(null)} className="ml-auto opacity-40 hover:opacity-100 shrink-0">
                        <X size={14} />
                    </button>
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
                        {/* Unified Camera Button */}
                        <button
                            onClick={() => setShowCameraPicker(true)}
                            className="w-10 h-10 flex items-center justify-center rounded-full text-brutal-black/50 hover:text-indigo-600 transition-all hover:bg-black/5 active:scale-90"
                            disabled={isProcessing}
                            title="Add Photo (Camera or Gallery)"
                        >
                            <Camera size={19} strokeWidth={2} />
                        </button>

                        {/* Voice Speech Recognition Button */}
                        <button
                            onClick={toggleListening}
                            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 relative ${
                                isListening
                                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse'
                                    : 'text-brutal-black/50 hover:text-indigo-600 hover:bg-black/5'
                            }`}
                            disabled={isProcessing}
                            title={isListening ? "Listening... (Tap to stop)" : "Voice Dictation"}
                        >
                            {isListening && (
                                <span className="animate-ping absolute inset-0 rounded-full bg-rose-400 opacity-75 pointer-events-none" />
                            )}
                            <Mic size={19} strokeWidth={2} />
                        </button>

                        {/* Batch Day Recap Button */}
                        <button
                            onClick={() => setIsBatchOpen(true)}
                            className="relative w-10 h-10 flex items-center justify-center rounded-full text-violet-500 hover:text-violet-600 transition-all hover:bg-violet-50 active:scale-90"
                            disabled={isProcessing}
                            title="Day Recap"
                        >
                            <LayoutGrid size={19} strokeWidth={2} />
                            <span className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[7px] font-bold uppercase px-1.5 py-0.5 rounded-full leading-none tracking-wider shadow-sm">PRO</span>
                        </button>

                        <div className="w-[1px] h-6 bg-black/10 mx-1" />

                        {/* Favorites Toggle */}
                        {favorites && favorites.length > 0 && (
                            <button
                                onClick={() => setShowFavorites(!showFavorites)}
                                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 ${showFavorites ? 'text-amber-500 bg-amber-50' : 'text-amber-400 hover:text-amber-500 hover:bg-amber-50'}`}
                                title="Toggle Favorites"
                            >
                                <Star size={19} strokeWidth={2} fill={showFavorites ? 'currentColor' : 'none'} />
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
                            placeholder={
                                isListening
                                    ? "Listening... Speak now..."
                                    : selectedImage
                                    ? "Add a comment about the photo..."
                                    : "Log food or speak... (e.g. 2 eggs, toast)"
                            }
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
                    {/* Batch Upload Modal */}
            <BatchUpload isOpen={isBatchOpen} onClose={() => setIsBatchOpen(false)} />
        </div>
    );
};

export default SmartLogging;
