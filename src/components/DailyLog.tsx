import { useEffect, useRef, useState } from 'react';
import { useStore, FoodEntry } from '../store/useStore';
import { Edit2, X, Trash2, Star, Activity, MessageSquare, Send, ChevronLeft } from 'lucide-react';
import gsap from 'gsap';
import { getAiResponse } from '../utils/ai';
import { playSound } from '../utils/audio';

const DailyLog = () => {
    const { dailyLog, updateEntry, deleteEntry, favorites, addFavorite, removeFavorite, historicalDays, processingLogs, viewedHistoryDate, setViewedHistoryDate } = useStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [isProcessing, setIsProcessing] = useState(false);

    // Brainstorm chat states
    const [chatInputs, setChatInputs] = useState<Record<string, string>>({});
    const [isChatting, setIsChatting] = useState<Record<string, boolean>>({});
    const [chatMessages, setChatMessages] = useState<Record<string, string>>({});

    // Swipe gesture refs
    const touchRef = useRef<{ id: string; startX: number; startY: number; locked: boolean | null } | null>(null);
    const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const actionLeftRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const actionRightRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const swipeOffsetRef = useRef(0);
    const didSwipeRef = useRef(false);

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

    const saveEdit = async (id: string, originalTimestamp: number, autoAdjust: boolean) => {
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

        if (autoAdjust && entry.name !== editForm.name) {
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

        updateEntry(id, finalData);
        setEditingId(null);
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this entry?")) {
            deleteEntry(id);
            setEditingId(null);
            setExpandedId(null);
        }
    };

    // --- Swipe handlers for delete/favorite ---
    const onCardTouchStart = (id: string, e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchRef.current = { id, startX: touch.clientX, startY: touch.clientY, locked: null };
        swipeOffsetRef.current = 0;
        const el = cardRefs.current[id];
        if (el) el.style.transition = 'none';
    };

    const onCardTouchMove = (id: string, e: React.TouchEvent) => {
        const t = touchRef.current;
        if (!t || t.id !== id) return;
        const touch = e.touches[0];
        const dx = touch.clientX - t.startX;
        const dy = touch.clientY - t.startY;
        if (t.locked === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
            t.locked = Math.abs(dx) > Math.abs(dy);
            if (!t.locked) { touchRef.current = null; return; }
        }
        if (!t.locked) return;
        e.preventDefault();
        const dampened = dx * 0.5;
        swipeOffsetRef.current = dampened;
        const el = cardRefs.current[id];
        if (el) el.style.transform = `translateX(${dampened}px)`;

        // Progressive icon reveal — scale & opacity grow toward threshold
        const THRESHOLD = 70;
        const progress = Math.min(Math.abs(dampened) / THRESHOLD, 1);
        const scale = 0.5 + progress * 0.7; // 0.5 → 1.2
        const opacity = 0.3 + progress * 0.7; // 0.3 → 1.0

        const leftEl = actionLeftRefs.current[id];
        const rightEl = actionRightRefs.current[id];
        if (dampened > 0 && leftEl) {
            leftEl.style.transform = `scale(${scale})`;
            leftEl.style.opacity = `${opacity}`;
        } else if (dampened < 0 && rightEl) {
            rightEl.style.transform = `scale(${scale})`;
            rightEl.style.opacity = `${opacity}`;
        }
    };

    const onCardTouchEnd = (id: string) => {
        const t = touchRef.current;
        if (!t || t.id !== id) { touchRef.current = null; return; }
        const offset = swipeOffsetRef.current;
        const THRESHOLD = 70;
        let acted = false;

        if (offset < -THRESHOLD) {
            // Swiped LEFT → Delete
            acted = true;
            playSound('error');
            // Use setTimeout so the UI snaps back before confirm dialog blocks
            setTimeout(() => {
                if (confirm('Delete this entry?')) {
                    deleteEntry(id);
                    setExpandedId(null);
                }
            }, 50);
        } else if (offset > THRESHOLD) {
            // Swiped RIGHT → Toggle Favorite
            acted = true;
            const entry = dailyLog.find(e => e.id === id);
            if (entry) {
                const isFav = (favorites || []).some(f => f.name === entry.name);
                if (isFav) { removeFavorite(entry.name); playSound('click'); }
                else { addFavorite({ name: entry.name, kcal: entry.kcal, protein: entry.protein, carbs: entry.carbs, fat: entry.fat }); playSound('targetHit'); }
            }
        }

        // Snap back card
        const el = cardRefs.current[id];
        if (el) {
            el.style.transition = 'transform 0.3s cubic-bezier(.2,.8,.3,1)';
            el.style.transform = 'translateX(0)';
        }
        // Reset action icons
        const leftEl = actionLeftRefs.current[id];
        const rightEl = actionRightRefs.current[id];
        if (leftEl) { leftEl.style.transition = 'all 0.3s ease'; leftEl.style.transform = 'scale(0.5)'; leftEl.style.opacity = '0'; }
        if (rightEl) { rightEl.style.transition = 'all 0.3s ease'; rightEl.style.transform = 'scale(0.5)'; rightEl.style.opacity = '0'; }
        touchRef.current = null;
        swipeOffsetRef.current = 0;
        if (acted) {
            didSwipeRef.current = true;
            setTimeout(() => { didSwipeRef.current = false; }, 120);
        }
    };

    const handleBrainstorm = async (entry: FoodEntry, e: React.FormEvent) => {
        e.preventDefault();
        const message = chatInputs[entry.id];
        if (!message || !message.trim()) return;

        setIsChatting(prev => ({ ...prev, [entry.id]: true }));

        try {
            const res = await fetch('/api/edit-entry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entry, message })
            });
            const data = await res.json();

            if (data.type === 'success' && data.data) {
                // Instantly update the parent store
                updateEntry(entry.id, data.data);
                // Clear input, set confirmation message
                setChatInputs(prev => ({ ...prev, [entry.id]: '' }));
                setChatMessages(prev => ({ ...prev, [entry.id]: data.aiMessage || 'Macros updated.' }));
            } else {
                alert("Failed to update entry.");
            }
        } catch (err) {
            console.error(err);
            alert("Network error.");
        } finally {
            setIsChatting(prev => ({ ...prev, [entry.id]: false }));
        }
    };

    const activeHistoryDay = viewedHistoryDate ? historicalDays?.find(d => d.dateStr === viewedHistoryDate) : null;
    const entriesToDisplay = activeHistoryDay ? activeHistoryDay.entries : dailyLog;
    const headerTitle = activeHistoryDay ? `History — ${viewedHistoryDate}` : 'Timeline';

    return (
        <div ref={containerRef} className="flex flex-col gap-4 mt-8 pb-32">
            {/* Sticky Timeline Header */}
            <div className={`sticky top-16 z-30 -mx-4 px-4 py-3 bg-off-white/80 backdrop-blur-2xl border-b border-brutal-black/5 shadow-sm mb-4 transition-colors ${activeHistoryDay ? 'bg-amber-50/90 border-amber-200/50' : ''}`}>
                <h3 className={`font-sans text-xs uppercase tracking-[0.2em] flex items-center justify-between ${activeHistoryDay ? 'opacity-80 text-amber-900 font-bold' : 'opacity-50'}`}>
                    <div className="flex items-center gap-2">
                        {activeHistoryDay && (
                            <button onClick={() => setViewedHistoryDate(null)} className="p-1 hover:bg-black/5 rounded-full -ml-2 -my-1 transition-colors relative z-40">
                                <ChevronLeft size={16} />
                            </button>
                        )}
                        <span>{headerTitle}</span>
                    </div>
                    {activeHistoryDay ? (
                        <div className="flex items-center gap-2 text-[10px] tabular-nums tracking-wider opacity-60">
                            <span>{activeHistoryDay.kcal} kcal</span>
                            <span>•</span>
                            <span>{activeHistoryDay.protein}g</span>
                        </div>
                    ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-brutal-black/30" />
                    )}
                </h3>
            </div>

            {entriesToDisplay.length === 0 ? (
                <div className="p-8 border-dashed border-brutal-black/20 rounded-2xl bg-black/5 text-center">
                    <p className="font-sans text-sm tracking-widest opacity-60">{activeHistoryDay ? "No entries for this day." : "No entries yet."}</p>
                </div>
            ) : (
                <div className="relative flex flex-col gap-4 z-10 pl-4">
                    {/* Vertical Timeline Guide */}
                    <div className="absolute left-0 top-6 bottom-6 w-[1px] bg-brutal-black/10 border-l border-dashed border-brutal-black/20 -z-10" />

                    {/* Pending API Requests - Only show on Today's timeline */}
                    {!activeHistoryDay && processingLogs.map((log) => (
                        <div key={log.id} className="relative w-full opacity-60 pointer-events-none">
                            <div className="absolute -left-5 top-8 w-2 h-2 rounded-full bg-off-white border-2 border-brutal-black/20 z-10 animate-pulse" />
                            <div className="log-card p-4 rounded-2xl bg-white/40 border border-white border-dashed flex items-center justify-between">
                                <div className="flex flex-col gap-1 w-2/3">
                                    <div className="h-5 bg-black/10 rounded-md animate-pulse" />
                                    <span className="font-sans text-xs opacity-50 italic truncate">Analyzing: "{log.text}"...</span>
                                </div>
                                <Activity size={20} className="animate-spin text-black/30" />
                            </div>
                        </div>
                    ))}

                    {entriesToDisplay.map((entry) => {
                        let displayTitle = entry.name;
                        let displayDetails = '';

                        // Parse *Title* format generated by AI: "*Banana* dvou banány (approx 240g)"
                        const starMatch = entry.name.match(/^\*([^*]+)\*\s*(.*)$/);
                        if (starMatch) {
                            displayTitle = starMatch[1];
                            displayDetails = starMatch[2];
                        } else if (entry.name.includes('||')) {
                            // Legacy: support old || format for existing entries
                            const parts = entry.name.split('||');
                            displayTitle = parts[0];
                            displayDetails = parts.slice(1).join(' ');
                        } else {
                            const words = entry.name.trim().split(/\s+/);
                            if (words.length > 2) {
                                displayTitle = words.slice(0, 2).join(' ');
                                displayDetails = words.slice(2).join(' ');
                            } else if (words.length === 2) {
                                displayTitle = words.join(' ');
                            }
                        }

                        return (
                            <div key={entry.id} className="relative w-full">
                                {/* Timeline dot */}
                                <div className="absolute -left-5 top-8 w-2 h-2 rounded-full bg-off-white border-2 border-brutal-black/20 z-10" />

                                {/* Swipe container */}
                                <div className="relative overflow-hidden rounded-2xl">
                                    {/* Action areas — fully hidden at rest, revealed on swipe */}
                                    <div className="absolute inset-0 pointer-events-none z-0 flex">
                                        <div className="flex-1 bg-emerald-500 flex items-center pl-5">
                                            <div ref={el => { actionLeftRefs.current[entry.id] = el; }} className="flex items-center gap-2" style={{ transform: 'scale(0.5)', opacity: 0, transition: 'none' }}>
                                                <Star size={20} className="text-white fill-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1 bg-red-500 flex items-center justify-end pr-5">
                                            <div ref={el => { actionRightRefs.current[entry.id] = el; }} className="flex items-center gap-2" style={{ transform: 'scale(0.5)', opacity: 0, transition: 'none' }}>
                                                <Trash2 size={20} className="text-white" />
                                            </div>
                                        </div>
                                    </div>

                                <div
                                    ref={el => { cardRefs.current[entry.id] = el; }}
                                    className={`log-card p-4 rounded-2xl bg-white shadow-sm border border-white/80 group relative cursor-pointer z-10`}
                                    onClick={() => {
                                        if (didSwipeRef.current) return;
                                        if (editingId !== entry.id) {
                                            setExpandedId(prev => prev === entry.id ? null : entry.id);
                                        }
                                    }}
                                    onTouchStart={(e) => onCardTouchStart(entry.id, e)}
                                    onTouchMove={(e) => onCardTouchMove(entry.id, e)}
                                    onTouchEnd={() => onCardTouchEnd(entry.id)}
                                >
                                    {editingId === entry.id ? (
                                        <div className="flex flex-col gap-3" onClick={e => e.stopPropagation()}>
                                            {/* Editing Form */}
                                            <div className="flex gap-2 items-start">
                                                <textarea rows={2} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="font-sans font-medium text-lg bg-black/5 p-2 rounded-xl outline-none flex-1 transition-colors focus:bg-white resize-none" />
                                                <input type="time" value={editForm.time} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} className="font-sans font-medium text-lg bg-black/5 p-2 rounded-xl outline-none w-24 shrink-0 text-center transition-colors focus:bg-white h-[44px]" />
                                            </div>
                                            <div className="grid grid-cols-4 gap-2">
                                                <div><label className="text-[10px] uppercase opacity-50 block mb-1">Kcal</label><input type="number" value={editForm.kcal} onChange={(e) => setEditForm({ ...editForm, kcal: e.target.value })} className="w-full bg-black/5 p-2 rounded-xl outline-none font-data focus:bg-white" /></div>
                                                <div><label className="text-[10px] uppercase opacity-50 block mb-1">Pro</label><input type="number" value={editForm.protein} onChange={(e) => setEditForm({ ...editForm, protein: e.target.value })} className="w-full bg-black/5 p-2 rounded-xl outline-none font-data focus:bg-white" /></div>
                                                <div><label className="text-[10px] uppercase opacity-50 block mb-1">Carb</label><input type="number" value={editForm.carbs} onChange={(e) => setEditForm({ ...editForm, carbs: e.target.value })} className="w-full bg-black/5 p-2 rounded-xl outline-none font-data focus:bg-white" /></div>
                                                <div><label className="text-[10px] uppercase opacity-50 block mb-1">Fat</label><input type="number" value={editForm.fat} onChange={(e) => setEditForm({ ...editForm, fat: e.target.value })} className="w-full bg-black/5 p-2 rounded-xl outline-none font-data focus:bg-white" /></div>
                                            </div>
                                            <div className="flex flex-wrap justify-between items-center mt-2 border-t border-black/5 pt-3 gap-2">
                                                <button onClick={() => handleDelete(entry.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider shrink-0">
                                                    <Trash2 size={16} /> Delete
                                                </button>
                                                <div className="flex gap-1.5 flex-1 justify-end min-w-fit">
                                                    <button onClick={() => setEditingId(null)} className="p-2 bg-black/5 rounded-xl hover:bg-black/10 transition-colors shrink-0"><X size={18} /></button>
                                                    <button title="Save Name Only" onClick={() => saveEdit(entry.id, entry.timestamp, false)} disabled={isProcessing} className="px-3 py-2 bg-black/80 text-white rounded-xl hover:bg-black text-[10px] uppercase font-bold tracking-wider transition-colors disabled:opacity-50 shrink-0">
                                                        Save
                                                    </button>
                                                    <button title="Recalculate Macros" onClick={() => saveEdit(entry.id, entry.timestamp, true)} disabled={isProcessing} className="px-2.5 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-[10px] uppercase font-bold tracking-wider transition-colors disabled:opacity-50 flex items-center gap-1 shrink-0">
                                                        {isProcessing ? <Activity size={14} className="animate-spin" /> : <Activity size={14} />} <span>Auto-Adjust</span>
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
                                                <div className="flex items-center justify-between w-full gap-4">
                                                    <div className="bg-black/5 rounded-md shrink-0 flex items-center justify-center py-2 px-1 min-h-[50px] w-7">
                                                        <span className="font-sans text-[12px] font-bold opacity-40 leading-none whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col min-w-0 flex-1">
                                                        <span className="font-sans font-semibold text-lg leading-tight text-brutal-black capitalize truncate">
                                                            {displayTitle}
                                                        </span>
                                                        {displayDetails && (
                                                            <span className="font-sans text-[11px] opacity-45 leading-snug truncate mt-0.5">
                                                                {displayDetails}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end shrink-0">
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="font-data text-2xl font-bold tracking-tighter leading-none text-brutal-black">{entry.kcal}</span>
                                                            <span className="text-[10px] uppercase font-semibold text-brutal-black/30 font-sans">Kcal</span>
                                                        </div>
                                                        <div className="flex items-baseline gap-1 mt-0.5">
                                                            <span className="font-data text-[11px] font-bold tracking-tighter leading-none text-brutal-black/50">{entry.protein}g</span>
                                                            <span className="text-[8px] uppercase font-semibold text-brutal-black/25 font-sans">Pro</span>
                                                        </div>
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

                                                    <div className="flex flex-wrap justify-between items-center pt-3 border-t border-brutal-black/5 mt-1 gap-y-2">
                                                        <div className="flex gap-2.5 font-sans font-semibold text-[11px] text-brutal-black/50 bg-black/5 px-2.5 py-1.5 rounded-lg border border-black/5 min-w-fit">
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

                                                        <div className="flex gap-1.5 shrink-0 ml-auto">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                                                                className="p-1.5 transition-colors rounded-full border text-brutal-black/30 hover:text-red-500 bg-white hover:bg-red-50 border-black/5"
                                                                title="Delete Entry"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const safeFavorites = favorites || [];
                                                                    const isFav = safeFavorites.some(f => f.name === entry.name);
                                                                    if (isFav) removeFavorite(entry.name);
                                                                    else addFavorite({ name: entry.name, kcal: entry.kcal, protein: entry.protein, carbs: entry.carbs, fat: entry.fat });
                                                                }}
                                                                className={`p-1.5 transition-colors rounded-full border ${(favorites || []).some(f => f.name === entry.name)
                                                                    ? 'bg-amber-50 text-amber-500 border-amber-200'
                                                                    : 'text-brutal-black/30 hover:text-amber-500 bg-white hover:bg-amber-50 border-black/5'
                                                                    }`}
                                                                title="Favorite"
                                                            >
                                                                <Star size={14} fill={(favorites || []).some(f => f.name === entry.name) ? 'currentColor' : 'none'} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); startEdit(entry); }}
                                                                className="p-1.5 transition-colors rounded-full border text-brutal-black/30 hover:text-indigo-500 bg-white hover:bg-indigo-50 border-black/5"
                                                                title="Edit Entry"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* AI Brainstorm Chat UI */}
                                                    <div className="mt-3 bg-black/5 rounded-xl overflow-hidden flex flex-col mx-[-8px] px-2 py-2">
                                                        {chatMessages[entry.id] && (
                                                            <div className="mb-2 px-3 py-2 bg-indigo-100 text-indigo-800 text-xs font-sans rounded-lg flex items-start gap-2 animate-in fade-in zoom-in-95 duration-200">
                                                                <MessageSquare size={14} className="mt-0.5 shrink-0" />
                                                                <span>{chatMessages[entry.id]}</span>
                                                            </div>
                                                        )}
                                                        <form onSubmit={(e) => handleBrainstorm(entry, e)} className="flex items-center gap-2 relative z-20">
                                                            <input
                                                                type="text"
                                                                placeholder="Ask AI to adjust recipe/amounts..."
                                                                className="flex-1 bg-white/60 text-brutal-black font-sans text-xs px-3 py-2 rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-indigo-400 placeholder:opacity-50 transition-colors"
                                                                value={chatInputs[entry.id] || ''}
                                                                onChange={(e) => setChatInputs(prev => ({ ...prev, [entry.id]: e.target.value }))}
                                                                onClick={(e) => e.stopPropagation()}
                                                                disabled={isChatting[entry.id]}
                                                            />
                                                            <button
                                                                type="submit"
                                                                disabled={isChatting[entry.id] || !chatInputs[entry.id]?.trim()}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors shrink-0"
                                                            >
                                                                {isChatting[entry.id] ? <Activity size={14} className="animate-spin" /> : <Send size={14} className="-ml-0.5 mt-0.5" />}
                                                            </button>
                                                        </form>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                </div>{/* /swipe container */}
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
};

export default DailyLog;
