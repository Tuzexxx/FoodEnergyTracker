import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { Edit2, Check, X, Trash2, Star, Activity } from 'lucide-react';
import gsap from 'gsap';
import { getAiResponse } from '../utils/ai';

const DailyLog = () => {
    const { dailyLog, updateEntry, deleteEntry, favorites, addFavorite, removeFavorite, yesterdayKcal, yesterdayProtein, targetKcal, targetProtein } = useStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!containerRef.current || dailyLog.length === 0) return;

        const cards = gsap.utils.toArray('.log-card') as HTMLElement[];
        if (cards.length > 0) {
            gsap.fromTo(cards[0],
                { y: -20, opacity: 0, scale: 0.95 },
                { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.7)' }
            );
        }
    }, [dailyLog.length]);

    const startEdit = (entry: any) => {
        setEditingId(entry.id);
        const timeStr = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
        setEditForm({
            name: entry.name,
            kcal: entry.kcal,
            protein: entry.protein,
            carbs: entry.carbs,
            fat: entry.fat,
            time: timeStr
        });
    };

    const saveEdit = async (id: string, originalTimestamp: number) => {
        const entry = dailyLog.find(e => e.id === id);
        if (!entry) return;

        const [hours, minutes] = editForm.time.split(':');
        const updatedDate = new Date(originalTimestamp);
        updatedDate.setHours(Number(hours), Number(minutes), 0, 0);

        let finalData = {
            name: editForm.name,
            kcal: Number(editForm.kcal),
            protein: Number(editForm.protein),
            carbs: Number(editForm.carbs),
            fat: Number(editForm.fat),
            timestamp: updatedDate.getTime(),
            requiresReview: false
        };

        if (entry.name !== editForm.name) {
            const wantsRecalc = window.confirm("You changed the name. Do you want AI to recalculate the values based on it? (Otherwise current numbers remain)");
            if (wantsRecalc) {
                setIsProcessing(true);
                const aiRes: any = await getAiResponse(editForm.name);
                setIsProcessing(false);
                if (aiRes.type === 'success' && aiRes.data) {
                    finalData.kcal = aiRes.data.kcal;
                    finalData.protein = aiRes.data.protein;
                    finalData.carbs = aiRes.data.carbs;
                    finalData.fat = aiRes.data.fat;
                } else if (aiRes.type === 'clarification') {
                    alert("AI needs clarification. Values remain original, adjust them manually.");
                } else {
                    alert("Error communicating with AI. Values remain original.");
                }
            }
        }

        updateEntry(id, finalData);
        setEditingId(null);
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this entry?")) {
            deleteEntry(id);
            setEditingId(null);
        }
    };

    return (
        <div ref={containerRef} className="flex flex-col gap-4 mt-8 pb-32">
            <h3 className="font-sans text-xs uppercase tracking-[0.2em] opacity-50 mb-4 sticky top-20 z-20 bg-off-white/80 backdrop-blur-xl py-2 px-2 rounded-lg mix-blend-multiply flex items-center justify-between">
                <span>Timeline</span>
                <span className="w-1.5 h-1.5 rounded-full bg-brutal-black/30" />
            </h3>

            {dailyLog.length === 0 ? (
                <div className="p-8 border-dashed border-brutal-black/20 rounded-2xl bg-black/5 text-center">
                    <p className="font-sans text-sm tracking-widest opacity-60">No entries yet.</p>
                </div>
            ) : (
                <div className="relative flex flex-col gap-4 z-10 pl-4">
                    {/* Vertical Timeline Guide */}
                    <div className="absolute left-0 top-6 bottom-6 w-[1px] bg-brutal-black/10 border-l border-dashed border-brutal-black/20 -z-10" />

                    {dailyLog.map((entry) => {
                        let displayTitle = entry.name;
                        let displayDetails = '';

                        if (entry.name.includes('||')) {
                            const parts = entry.name.split('||');
                            displayTitle = parts[0];
                            displayDetails = parts.slice(1).join('||');
                        } else {
                            const words = entry.name.trim().split(/\s+/);
                            if (words.length > 1) {
                                displayTitle = words[0];
                                displayDetails = words.slice(1).join(' ');
                            }
                        }

                        return (
                            <div key={entry.id} className="relative w-full">
                                {/* Timeline dot */}
                                <div className="absolute -left-5 top-8 w-2 h-2 rounded-full bg-off-white border-2 border-brutal-black/20 z-10" />

                                <div
                                    className={`log-card p-4 rounded-2xl transition-all duration-300 bg-white/60 backdrop-blur-md shadow-sm border group relative cursor-pointer
                                border-white hover:border-brutal-black/10 hover:shadow-md hover:bg-white/80`}
                                    onClick={() => {
                                        if (editingId !== entry.id) {
                                            setExpandedId(prev => prev === entry.id ? null : entry.id);
                                        }
                                    }}
                                >
                                    {editingId === entry.id ? (
                                        <div className="flex flex-col gap-3" onClick={e => e.stopPropagation()}>
                                            {/* Editing Form */}
                                            <div className="flex gap-2">
                                                <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="font-sans font-medium text-lg bg-black/5 p-2 rounded-xl outline-none flex-1 transition-colors focus:bg-white" />
                                                <input type="time" value={editForm.time} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} className="font-sans font-medium text-lg bg-black/5 p-2 rounded-xl outline-none w-24 shrink-0 text-center transition-colors focus:bg-white" />
                                            </div>
                                            <div className="grid grid-cols-4 gap-2">
                                                <div><label className="text-[10px] uppercase opacity-50 block mb-1">Kcal</label><input type="number" value={editForm.kcal} onChange={(e) => setEditForm({ ...editForm, kcal: e.target.value })} className="w-full bg-black/5 p-2 rounded-xl outline-none font-data focus:bg-white" /></div>
                                                <div><label className="text-[10px] uppercase opacity-50 block mb-1">Pro</label><input type="number" value={editForm.protein} onChange={(e) => setEditForm({ ...editForm, protein: e.target.value })} className="w-full bg-black/5 p-2 rounded-xl outline-none font-data focus:bg-white" /></div>
                                                <div><label className="text-[10px] uppercase opacity-50 block mb-1">Carb</label><input type="number" value={editForm.carbs} onChange={(e) => setEditForm({ ...editForm, carbs: e.target.value })} className="w-full bg-black/5 p-2 rounded-xl outline-none font-data focus:bg-white" /></div>
                                                <div><label className="text-[10px] uppercase opacity-50 block mb-1">Fat</label><input type="number" value={editForm.fat} onChange={(e) => setEditForm({ ...editForm, fat: e.target.value })} className="w-full bg-black/5 p-2 rounded-xl outline-none font-data focus:bg-white" /></div>
                                            </div>
                                            <div className="flex justify-between items-center mt-2 border-t border-black/5 pt-3">
                                                <button onClick={() => handleDelete(entry.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1 text-xs font-sans font-medium">
                                                    <Trash2 size={16} /> Delete
                                                </button>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditingId(null)} className="p-2 bg-black/5 rounded-xl hover:bg-black/10 transition-colors"><X size={18} /></button>
                                                    <button onClick={() => saveEdit(entry.id, entry.timestamp)} disabled={isProcessing} className="p-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-colors disabled:opacity-50">
                                                        {isProcessing ? <Activity size={18} className="animate-spin" /> : <Check size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col w-full relative">
                                            {/* Status Indicator for items needing review */}
                                            {entry.requiresReview && expandedId !== entry.id && (
                                                <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 rounded-full bg-orange-500 animate-pulse" title="Requires Review" />
                                            )}

                                            {/* Collapsed 1-row view */}
                                            {expandedId !== entry.id && (
                                                <div className="flex items-center justify-between w-full h-8">
                                                    <div className="flex items-center gap-3 w-3/4 pr-4 overflow-hidden">
                                                        <span className="font-sans text-[11px] font-medium opacity-50 bg-black/5 px-2 py-0.5 rounded-md shrink-0">
                                                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <div className="flex items-baseline gap-2 truncate">
                                                            <span className="font-sans font-semibold text-lg leading-tight text-brutal-black shrink-0 capitalize">
                                                                {displayTitle}
                                                            </span>
                                                            {displayDetails && (
                                                                <span className="font-sans text-xs opacity-50 truncate">
                                                                    {displayDetails}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-baseline gap-1 shrink-0">
                                                        <span className="font-data text-2xl font-bold tracking-tighter leading-none text-brutal-black">{entry.kcal}</span>
                                                        <span className="text-[10px] uppercase font-semibold text-brutal-black/30 font-sans">Kcal</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Expanded 3-row view */}
                                            {expandedId === entry.id && (
                                                <div className="flex flex-col gap-3 w-full animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="flex flex-col flex-1 min-w-0">
                                                            <span className="font-sans text-[11px] font-medium opacity-50 bg-black/5 px-2 py-0.5 rounded-md w-fit mb-2">
                                                                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            <span className="font-sans font-semibold text-xl leading-tight text-brutal-black break-words capitalize">
                                                                {displayTitle}
                                                            </span>
                                                            {displayDetails && (
                                                                <span className="font-sans text-sm opacity-70 leading-snug mt-1.5 italic text-brutal-black/90 whitespace-pre-wrap">
                                                                    {displayDetails}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-baseline gap-1 shrink-0 pl-2">
                                                            <span className="font-data text-3xl font-bold tracking-tighter leading-none text-brutal-black">{entry.kcal}</span>
                                                            <span className="text-[10px] uppercase font-semibold text-brutal-black/40 font-sans">Kcal</span>
                                                        </div>
                                                    </div>

                                                    {/* AI Estimation Legend Banner */}
                                                    {entry.requiresReview && (
                                                        <div className="mt-2 w-full flex items-center gap-2 p-2 bg-orange-50/50 rounded-lg border border-orange-200">
                                                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
                                                            <span className="font-sans text-[10px] uppercase font-semibold text-orange-600 tracking-wider">
                                                                AI Estimated Portion - Please check
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="flex justify-between items-center pt-3 border-t border-brutal-black/5 mt-1">
                                                        <div className="flex gap-2.5 font-sans font-semibold text-[11px] text-brutal-black/50 bg-black/5 px-3 py-1.5 rounded-lg border border-black/5">
                                                            <span className="flex gap-1.5 items-center">
                                                                <span className="opacity-50 text-[9px] uppercase">Pro</span><span className="text-brutal-black/80">{entry.protein}</span>
                                                            </span>
                                                            <span className="w-[1px] h-3.5 bg-black/10" />
                                                            <span className="flex gap-1.5 items-center">
                                                                <span className="opacity-50 text-[9px] uppercase">Carb</span><span className="text-brutal-black/80">{entry.carbs}</span>
                                                            </span>
                                                            <span className="w-[1px] h-3.5 bg-black/10" />
                                                            <span className="flex gap-1.5 items-center">
                                                                <span className="opacity-50 text-[9px] uppercase">Fat</span><span className="text-brutal-black/80">{entry.fat}</span>
                                                            </span>
                                                        </div>

                                                        <div className="flex gap-2 shrink-0">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const safeFavorites = favorites || [];
                                                                    const isFav = safeFavorites.some(f => f.name === entry.name);
                                                                    if (isFav) removeFavorite(entry.name);
                                                                    else addFavorite({ name: entry.name, kcal: entry.kcal, protein: entry.protein, carbs: entry.carbs, fat: entry.fat });
                                                                }}
                                                                className={`p-2 transition-colors rounded-full shadow-sm border ${(favorites || []).some(f => f.name === entry.name)
                                                                    ? 'bg-amber-50 text-amber-500 border-amber-200'
                                                                    : 'text-brutal-black/40 hover:text-amber-500 bg-white hover:bg-amber-50 border-black/5'
                                                                    }`}
                                                                title="Favorite"
                                                            >
                                                                <Star size={16} fill={(favorites || []).some(f => f.name === entry.name) ? 'currentColor' : 'none'} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); startEdit(entry); }}
                                                                className={`p-2 transition-colors rounded-full shadow-sm flex items-center justify-center border ${entry.requiresReview
                                                                    ? 'bg-orange-100 text-orange-600 border-orange-200'
                                                                    : 'text-brutal-black/40 hover:text-indigo-500 bg-white hover:bg-indigo-50 border-black/5'
                                                                    }`}
                                                                title="Edit Entry"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Yesterday 's Summary */}
            {(yesterdayKcal > 0 || yesterdayProtein > 0) && (
                <div className="mt-8 p-6 bg-brutal-black/5 rounded-3xl flex flex-col items-center justify-center text-center border border-brutal-black/5">
                    <h4 className="font-sans text-[10px] font-semibold uppercase tracking-widest opacity-60 mb-4 text-brutal-black">Yesterday's Summary</h4>
                    <div className="flex items-center gap-4">
                        <span className={`font-data text-2xl ${yesterdayKcal > targetKcal ? 'text-signal-red' : 'text-brutal-black'}`}>
                            {yesterdayKcal} <span className="font-sans text-[10px] uppercase opacity-50 text-brutal-black">/ {targetKcal} KCAL</span>
                        </span>
                        <div className="w-[1px] h-6 bg-brutal-black/10" />
                        <span className={`font-data text-2xl ${yesterdayProtein < targetProtein ? 'text-signal-red' : 'text-brutal-black'}`}>
                            {yesterdayProtein} <span className="font-sans text-[10px] uppercase opacity-50 text-brutal-black">/ {targetProtein}G PRO</span>
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyLog;
