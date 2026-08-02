import { useState, useRef, useCallback, useEffect } from 'react';
import { X, LayoutGrid, Check, AlertCircle, Loader2, Upload, Clock, Sparkles, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getAiResponse } from '../utils/ai';
import { extractPhotoTimestamp } from '../utils/exifTimestamp';
import { playSound } from '../utils/audio';

interface PhotoItem {
    id: string;
    file: File;
    preview: string;
    timestamp: number;
    status: 'pending' | 'processing' | 'success' | 'error';
    errorMessage?: string;
}

const MAX_PHOTOS = 10;
const MAX_DIMENSION = 1000;

function resizeImageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

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
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = reject;
            img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

interface BatchUploadProps {
    isOpen: boolean;
    onClose: () => void;
}

const BatchUpload = ({ isOpen, onClose }: BatchUploadProps) => {
    const [photos, setPhotos] = useState<PhotoItem[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [completedCount, setCompletedCount] = useState(0);
    const [failedCount, setFailedCount] = useState(0);
    const [isDone, setIsDone] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const photosRef = useRef<PhotoItem[]>([]);
    const { addEntryWithTimestamp } = useStore();

    useEffect(() => () => {
        photosRef.current.forEach(photo => URL.revokeObjectURL(photo.preview));
    }, []);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const limitedFiles = files.slice(0, MAX_PHOTOS);

        const items: PhotoItem[] = await Promise.all(
            limitedFiles.map(async (file) => {
                const timestamp = await extractPhotoTimestamp(file);
                const preview = URL.createObjectURL(file);
                return {
                    id: globalThis.crypto?.randomUUID?.() || Math.random().toString(36).substring(2),
                    file,
                    preview,
                    timestamp,
                    status: 'pending' as const,
                };
            })
        );

        // Sort by timestamp (earliest first) for chronological processing
        items.sort((a, b) => a.timestamp - b.timestamp);
        photosRef.current.forEach(photo => URL.revokeObjectURL(photo.preview));
        photosRef.current = items;
        setPhotos(items);
        setIsDone(false);
        setCompletedCount(0);
        setFailedCount(0);

        if (e.target) e.target.value = '';
    }, []);

    
    const retryPhoto = useCallback(async (photoId: string) => {
        const photo = photos.find(p => p.id === photoId);
        if (!photo || isAnalyzing) return;

        setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, status: 'processing', errorMessage: undefined } : p));
        setIsAnalyzing(true);

        try {
            const base64 = await resizeImageToBase64(photo.file);
            const promptText = "Analyze this food image. Estimate macros accurately with approximate metric weight (grams/ml).";
            const response: any = await getAiResponse(promptText, base64);

            if (response.type === 'success' && response.data) {
                addEntryWithTimestamp(response.data, photo.timestamp);
                setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, status: 'success' } : p));
                setCompletedCount(c => c + 1);
                setFailedCount(f => Math.max(0, f - 1));
                playSound('log');
            } else {
                const msg = response.error || (response.type === 'clarification' ? 'Image requires review' : 'Analysis failed');
                setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, status: 'error', errorMessage: msg } : p));
                playSound('error');
            }
        } catch (err: any) {
            setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, status: 'error', errorMessage: err.message || 'Error' } : p));
            playSound('error');
        } finally {
            setIsAnalyzing(false);
        }
    }, [photos, isAnalyzing, addEntryWithTimestamp]);

    const analyzeAll = useCallback(async () => {
        if (photos.length === 0) return;

        setIsAnalyzing(true);
        setCurrentIndex(0);
        setCompletedCount(0);
        setFailedCount(0);

        let succeeded = 0;
        let failed = 0;

        for (let i = 0; i < photos.length; i++) {
            setCurrentIndex(i);
            setPhotos(prev => prev.map((p, idx) =>
                idx === i ? { ...p, status: 'processing' } : p
            ));

            try {
                const base64 = await resizeImageToBase64(photos[i].file);
                const response: any = await getAiResponse(
                    'Analyze this food image and estimate macros.',
                    base64
                );

                if (response.type === 'success' && response.data) {
                    addEntryWithTimestamp(response.data, photos[i].timestamp);
                    succeeded++;
                    setCompletedCount(succeeded);
                    setPhotos(prev => prev.map((p, idx) =>
                        idx === i ? { ...p, status: 'success' } : p
                    ));
                    playSound('log');
                } else {
                    failed++;
                    setFailedCount(failed);
                    setPhotos(prev => prev.map((p, idx) =>
                        idx === i ? { ...p, status: 'error', errorMessage: response.error || response.question || 'Analysis failed' } : p
                    ));
                }
            } catch (err: any) {
                failed++;
                setFailedCount(failed);
                setPhotos(prev => prev.map((p, idx) =>
                    idx === i ? { ...p, status: 'error', errorMessage: err.message || 'Network error' } : p
                ));
            }

            // Small delay between requests to avoid rate limiting
            if (i < photos.length - 1) {
                await new Promise(r => setTimeout(r, 500));
            }
        }

        setIsAnalyzing(false);
        setIsDone(true);
        if (succeeded > 0) playSound('targetHit');
    }, [photos, addEntryWithTimestamp]);

    const handleClose = () => {
        // Cleanup object URLs
        photosRef.current.forEach(p => URL.revokeObjectURL(p.preview));
        photosRef.current = [];
        setPhotos([]);
        setIsAnalyzing(false);
        setIsDone(false);
        setCurrentIndex(0);
        setCompletedCount(0);
        setFailedCount(0);
        onClose();
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const formatDate = (timestamp: number) => {
        const d = new Date(timestamp);
        const today = new Date();
        if (d.toDateString() === today.toDateString()) return 'Today';
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-off-white">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-brutal-black/10 bg-white/80 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                        <LayoutGrid size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="font-sans font-bold text-lg leading-tight text-brutal-black">Day Recap</h2>
                        <span className="font-sans text-[10px] uppercase tracking-widest opacity-50">Batch Photo Analysis</span>
                    </div>
                </div>
                <button
                    onClick={handleClose}
                    disabled={isAnalyzing}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 transition-colors disabled:opacity-30"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                {photos.length === 0 ? (
                    /* Empty State � File Picker */
                    <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
                        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center border-2 border-dashed border-indigo-300">
                            <Upload size={36} className="text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="font-sans font-bold text-xl text-brutal-black mb-2">Upload Your Day</h3>
                            <p className="font-sans text-sm text-brutal-black/50 max-w-xs leading-relaxed">
                                Select up to {MAX_PHOTOS} food photos. The app reads each photo's timestamp for correct chronology.
                            </p>
                        </div>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-8 py-4 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-2xl font-sans font-bold text-sm uppercase tracking-wider shadow-xl shadow-indigo-500/25 hover:shadow-2xl hover:shadow-indigo-500/30 active:scale-95 transition-all"
                        >
                            Choose Photos
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                    </div>
                ) : (
                    /* Photo Grid with Status */
                    <div className="flex flex-col gap-4">
                        {/* Progress Bar */}
                        {isAnalyzing && (
                            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-white shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-sans text-xs font-bold uppercase tracking-wider text-brutal-black/60">
                                        Analyzing {currentIndex + 1}/{photos.length}
                                    </span>
                                    <span className="font-data text-sm font-bold text-indigo-600">
                                        {completedCount} done
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-black/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${((currentIndex + 1) / photos.length) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Completion Summary */}
                        {isDone && (
                            <div className="bg-gradient-to-r from-emerald-50 to-green-50 backdrop-blur-md rounded-2xl p-4 border border-emerald-200 shadow-sm animate-in fade-in zoom-in-95">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                                        <Check size={20} className="text-white" strokeWidth={3} />
                                    </div>
                                    <div>
                                        <span className="font-sans font-bold text-emerald-800 block">All Done!</span>
                                        <span className="font-sans text-xs text-emerald-600">
                                            {completedCount} {completedCount === 1 ? 'entry' : 'entries'} added
                                            {failedCount > 0 && `, ${failedCount} failed`}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Photo Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {photos.map((photo, idx) => (
                                <div
                                    key={photo.id}
                                    className={`relative rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                                        photo.status === 'processing' ? 'border-indigo-400 shadow-lg shadow-indigo-500/20 scale-[1.02]' :
                                        photo.status === 'success' ? 'border-emerald-400' :
                                        photo.status === 'error' ? 'border-red-400' :
                                        'border-white/60'
                                    }`}
                                >
                                    <img
                                        src={photo.preview}
                                        alt={`Food photo ${idx + 1}`}
                                        className="w-full aspect-square object-cover"
                                    />

                                    {/* Time Badge */}
                                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white px-2 py-1 rounded-lg flex items-center gap-1">
                                        <Clock size={10} />
                                        <span className="font-data text-[10px] font-bold">{formatTime(photo.timestamp)}</span>
                                    </div>

                                    {/* Date Badge (if not today) */}
                                    {formatDate(photo.timestamp) !== 'Today' && (
                                        <div className="absolute top-2 right-2 bg-amber-500/90 backdrop-blur-md text-white px-2 py-1 rounded-lg">
                                            <span className="font-sans text-[9px] font-bold uppercase">{formatDate(photo.timestamp)}</span>
                                        </div>
                                    )}

                                    {/* Status Overlay */}
                                    {photo.status === 'processing' && (
                                        <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm flex items-center justify-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 size={28} className="text-white animate-spin" />
                                                <span className="font-sans text-[10px] uppercase tracking-wider text-white font-bold">Analyzing</span>
                                            </div>
                                        </div>
                                    )}

                                    {photo.status === 'success' && (
                                        <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg animate-in zoom-in-50 duration-300">
                                            <Check size={18} className="text-white" strokeWidth={3} />
                                        </div>
                                    )}

                                    {photo.status === 'error' && (
                                        <div className="absolute inset-0 bg-red-900/40 backdrop-blur-sm flex items-center justify-center p-2">
                                            <div className="flex flex-col items-center gap-1.5 text-center">
                                                <AlertCircle size={20} className="text-red-300" />
                                                <span className="font-sans text-[9px] text-red-100 font-bold leading-tight line-clamp-2">
                                                    {photo.errorMessage || 'Failed'}
                                                </span>
                                                {!isAnalyzing && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); retryPhoto(photo.id); }}
                                                        className="mt-1 px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white text-[9px] font-bold uppercase rounded-full tracking-wider flex items-center gap-1 transition active:scale-95"
                                                    >
                                                        <RefreshCw size={10} /> Retry
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Index Badge */}
                                    <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-md text-white w-6 h-6 rounded-full flex items-center justify-center">
                                        <span className="font-data text-[10px] font-bold">{idx + 1}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Reselect Photos */}
                        {!isAnalyzing && !isDone && (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-3 text-center font-sans text-xs uppercase tracking-wider text-brutal-black/40 hover:text-brutal-black/60 transition-colors"
                            >
                                Change selection ({photos.length}/{MAX_PHOTOS})
                            </button>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleFileSelect}
                        />
                    </div>
                )}
            </div>

            {/* Bottom Action Bar */}
            {photos.length > 0 && (
                <div className="px-4 py-4 border-t border-brutal-black/10 bg-white/80 backdrop-blur-xl">
                    {isDone ? (
                        <button
                            onClick={handleClose}
                            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl font-sans font-bold text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/25 active:scale-[0.98] transition-all"
                        >
                            Done
                        </button>
                    ) : (
                        <button
                            onClick={analyzeAll}
                            disabled={isAnalyzing}
                            className="w-full py-4 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-2xl font-sans font-bold text-sm uppercase tracking-wider shadow-xl shadow-indigo-500/25 disabled:opacity-50 disabled:shadow-none active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Analyzing {currentIndex + 1} of {photos.length}...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    Analyze All ({photos.length} {photos.length === 1 ? 'photo' : 'photos'})
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default BatchUpload;
