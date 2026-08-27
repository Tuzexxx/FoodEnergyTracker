import { useEffect, useRef, useState } from 'react';
import { useStore, FoodEntry } from '../store/useStore';
import { Edit2, X, Trash2, Star, Activity, MessageSquare, Send, ChevronLeft, ChevronDown, ChevronUp, Plus, Minus } from 'lucide-react';
import gsap from 'gsap';
import { getAiResponse } from '../utils/ai';
import { playSound } from '../utils/audio';
import { EXERCISE_BONUS_KCAL, EXERCISE_BONUS_PROTEIN } from '../store/useStore';
import { calculateMacroDistribution } from '../utils/calorieFormula';
import { supabase } from '../utils/supabase';

function parsePortionMultiplier(name: string): { multiplier: number; cleanName: string } {
    let multiplier = 1;
    let cleanName = name;

    // Pattern 1: Starts with digits + x (e.g. "2x Banana" or "*2x Banana*" or "2x Banana || ...")
    const prefixMatch = name.match(/^(\*?)(\d+(?:\.\d+)?)\s*x\s+(.*)/i);
    if (prefixMatch) {
        multiplier = Math.max(1, parseFloat(prefixMatch[2]) || 1);
        cleanName = prefixMatch[1] + prefixMatch[3];
        return { multiplier, cleanName };
    }

    // Pattern 2: Parentheses with Nx (e.g. "Banana (2x)" or "*Banana (2x)* || ...")
    const parenMatch = name.match(/^(.*?)\s*\((\d+(?:\.\d+)?)x\)(.*)/i);
    if (parenMatch) {
        multiplier = Math.max(1, parseFloat(parenMatch[2]) || 1);
        cleanName = (parenMatch[1] + parenMatch[3]).trim();
        return { multiplier, cleanName };
    }

    return { multiplier: 1, cleanName: name };
}

function formatPortionName(cleanName: string, multiplier: number): string {
    if (multiplier <= 1) return cleanName;
    
    // If star format: *Melon* || 300g -> *2x Melon* || 300g
    if (cleanName.startsWith('*') && cleanName.includes('*')) {
        return cleanName.replace(/^\*([^\*]+)\*/, `*${multiplier}x $1*`);
    }
    
    // Standard format: 2x Banana
    return `${multiplier}x ${cleanName}`;
}

const DailyLog = () => {
    const { dailyLog, updateEntry, deleteEntry, favorites, addFavorite, removeFavorite, historicalDays, processingLogs, viewedHistoryDate, setViewedHistoryDate, targetKcal, targetProtein, historicalExerciseDays } = useStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [expandedHistoryPanel, setExpandedHistoryPanel] = useState<string | null>(null);

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

        const finalData = {
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

    const handleAdjustPortion = (entry: FoodEntry, delta: number) => {
        playSound('click');
        const { multiplier: currentMult, cleanName } = parsePortionMultiplier(entry.name);
        const nextMult = Math.max(1, currentMult + delta);
        if (nextMult === currentMult) return;

        // Base unit calories and macros
        const baseKcal = entry.kcal / currentMult;
        const baseProtein = entry.protein / currentMult;
        const baseCarbs = (entry.carbs ?? 0) / currentMult;
        const baseFat = (entry.fat ?? 0) / currentMult;

        const updatedName = formatPortionName(cleanName, nextMult);

        updateEntry(entry.id, {
            name: updatedName,
            kcal: Math.round(baseKcal * nextMult),
            protein: Math.round(baseProtein * nextMult),
            carbs: Math.round(baseCarbs * nextMult),
            fat: Math.round(baseFat * nextMult),
        });
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

        // Progressive icon reveal - scale & opacity grow toward threshold
        const THRESHOLD = 70;
        const progress = Math.min(Math.abs(dampened) / THRESHOLD, 1);
        const scale = 0.5 + progress * 0.7; // 0.5  1.2
        const opacity = 0.3 + progress * 0.7; // 0.3  1.0

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
            // Swiped LEFT  Delete
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
            // Swiped RIGHT  Toggle Favorite
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
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
            else headers['X-Client-Mode'] = 'guest';

            const res = await fetch('/api/edit-entry', {
                method: 'POST',
                headers,
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
    const headerTitle = activeHistoryDay ? `History - ${viewedHistoryDate}` : 'Timeline';

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
                            <span></span>
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

                        // Parse *Title* format generated by AI: "*Banana* dvou banny (approx 240g)"
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
                                    {/* Action areas - fully hidden at rest, revealed on swipe */}
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
                                                                                        <div className="flex items-center justify-between w-full gap-3">
                                                <div className="bg-black/5 rounded-md shrink-0 flex items-center justify-center py-2 px-1 min-h-[50px] w-7">
                                                    <span className="font-sans text-[12px] font-bold opacity-40 leading-none whitespace-nowrap" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <span className={`font-sans font-semibold text-base sm:text-lg leading-tight text-brutal-black capitalize ${expandedId === entry.id ? 'break-words' : 'truncate'}`}>
                                                        {displayTitle}
                                                    </span>
                                                    {displayDetails && (
                                                        <span className={`font-sans text-brutal-black ${expandedId === entry.id ? 'text-xs opacity-75 leading-relaxed mt-1 break-words whitespace-pre-wrap' : 'text-[11px] opacity-45 leading-snug truncate mt-0.5'}`}>
                                                            {displayDetails}
                                                        </span>
                                                    )}
                                                    {/* Direct instant macros visible at first glance */}
                                                    <div className="flex items-center gap-2 text-[10px] font-sans text-brutal-black/40 mt-1">
                                                        <span>
                                                            <strong className="font-bold text-brutal-black/75">{entry.protein ?? 0}g</strong> <span className="text-[8px] font-normal uppercase opacity-45">pro</span>
                                                        </span>
                                                        <span className="opacity-25">/</span>
                                                        <span>
                                                            <strong className="font-bold text-brutal-black/75">{entry.carbs ?? 0}g</strong> <span className="text-[8px] font-normal uppercase opacity-45">carb</span>
                                                        </span>
                                                        <span className="opacity-25">/</span>
                                                        <span>
                                                            <strong className="font-bold text-brutal-black/75">{entry.fat ?? 0}g</strong> <span className="text-[8px] font-normal uppercase opacity-45">fat</span>
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0 pl-1">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="font-data text-2xl font-bold tracking-tighter leading-none text-brutal-black">{entry.kcal}</span>
                                                        <span className="text-[10px] uppercase font-semibold text-brutal-black/30 font-sans">Kcal</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Action Menu Drawer */}
                                            {expandedId === entry.id && (
                                                <div className="mt-3 pt-2.5 border-t border-black/5 flex flex-col gap-2 w-full animate-in fade-in slide-in-from-top-2 duration-200">
                                                    {/* AI Review Banner */}
                                                    {entry.requiresReview && (
                                                        <div className="flex items-center gap-2 p-2 bg-orange-50/70 rounded-xl border border-orange-200 text-orange-700 text-xs">
                                                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
                                                            <span className="font-sans text-[10px] uppercase font-semibold tracking-wider">
                                                                AI Estimated Portion - Please check
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Action Buttons Row */}
                                                    <div className="flex items-center justify-between gap-2 w-full pt-1">
                                                        {/* Portion Stepper Controls: [ - ] [ Nx ] [ + ] */}
                                                        {(() => {
                                                            const { multiplier: currentMultiplier } = parsePortionMultiplier(entry.name);
                                                            return (
                                                                <div className="flex items-center gap-1.5 p-1 bg-black/5 rounded-full border border-black/5 shrink-0">
                                                                    {/* Minus button */}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleAdjustPortion(entry, -1);
                                                                        }}
                                                                        disabled={currentMultiplier <= 1}
                                                                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                                                            currentMultiplier <= 1
                                                                                ? 'opacity-25 cursor-not-allowed text-brutal-black'
                                                                                : 'bg-white hover:bg-black/10 text-brutal-black active:scale-90 shadow-xs'
                                                                        }`}
                                                                        title="Decrease portion (-1x)"
                                                                    >
                                                                        <Minus size={13} strokeWidth={2.5} />
                                                                    </button>

                                                                    {/* Current multiplier badge */}
                                                                    <span className="font-data font-bold text-xs text-brutal-black px-1 min-w-[22px] text-center">
                                                                        {currentMultiplier}x
                                                                    </span>

                                                                    {/* Plus button */}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleAdjustPortion(entry, 1);
                                                                        }}
                                                                        className="w-7 h-7 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-all active:scale-90 shadow-sm"
                                                                        title="Add 1 more portion (+1x)"
                                                                    >
                                                                        <Plus size={13} strokeWidth={2.5} />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Secondary Action Icons */}
                                                        <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                                            {/* Favorite */}
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const safeFavorites = favorites || [];
                                                                    const isFav = safeFavorites.some(f => f.name === entry.name);
                                                                    if (isFav) removeFavorite(entry.name);
                                                                    else addFavorite({ name: entry.name, kcal: entry.kcal, protein: entry.protein, carbs: entry.carbs, fat: entry.fat });
                                                                }}
                                                                className={`p-2 transition-colors rounded-full border ${(favorites || []).some(f => f.name === entry.name)
                                                                    ? 'bg-amber-50 text-amber-500 border-amber-200'
                                                                    : 'text-brutal-black/40 hover:text-amber-500 bg-white hover:bg-amber-50 border-black/5'
                                                                    }`}
                                                                title="Favorite"
                                                            >
                                                                <Star size={15} fill={(favorites || []).some(f => f.name === entry.name) ? 'currentColor' : 'none'} />
                                                            </button>

                                                            {/* Edit */}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); startEdit(entry); }}
                                                                className="p-2 transition-colors rounded-full border text-brutal-black/40 hover:text-indigo-600 bg-white hover:bg-indigo-50 border-black/5"
                                                                title="Edit Entry"
                                                            >
                                                                <Edit2 size={15} />
                                                            </button>

                                                            {/* Delete */}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                                                                className="p-2 transition-colors rounded-full border text-brutal-black/40 hover:text-red-500 bg-white hover:bg-red-50 border-black/5"
                                                                title="Delete Entry"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* AI Brainstorm Chat UI */}
                                                    <div className="mt-2 bg-black/5 rounded-xl overflow-hidden flex flex-col px-2 py-2">
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
                                                                className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center shrink-0"
                                                            >
                                                                {isChatting[entry.id] ? <Activity size={14} className="animate-spin" /> : <Send size={14} />}
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

            {/* Recent History Summaries (Only show when NOT viewing a specific history day) */}
            {!activeHistoryDay && historicalDays && historicalDays.length > 0 && (
                <div className="mt-8 flex flex-col gap-2 relative z-10 pl-4 border-t border-dashed border-brutal-black/20 pt-8">
                    <div className="absolute left-0 top-6 bottom-0 w-[1px] bg-brutal-black/10 border-l border-dashed border-brutal-black/10 -z-10" />

                    <div className="flex items-center gap-2 mb-2 bg-off-white w-fit px-2 py-1 absolute -top-[14px] left-1">
                        <h4 className="font-sans text-[10px] uppercase tracking-[0.2em] font-bold opacity-30">Previous Days</h4>
                    </div>

                    {historicalDays.slice(0, 7).map((day) => {
                        const dayAbbr = (() => {
                            if (day.dateStr === 'Yesterday') return 'Yest';
                            if (day.entries && day.entries.length > 0) {
                                const d = new Date(Number(day.entries[0].timestamp));
                                return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
                            }
                            return '';
                        })();
                        
                        const shortDate = day.dateStr === 'Yesterday' ? '' : day.dateStr.replace(/, \d{4}$/, '');
                        
                        // Progress & Color Logic
                        const isGymDay = historicalExerciseDays?.includes(day.realDateStr) || false;
                        const effectiveTargetKcal = (day.targetKcal ?? targetKcal) + (isGymDay ? EXERCISE_BONUS_KCAL : 0);
                        const effectiveTargetProtein = (day.targetProtein ?? targetProtein) + (isGymDay ? EXERCISE_BONUS_PROTEIN : 0);

                        const kcalHit = day.kcal <= effectiveTargetKcal && day.kcal > 0;
                        const kcalOver = day.kcal > effectiveTargetKcal;
                        const proteinHit = day.protein >= effectiveTargetProtein;

                        // Carbs & Fat calculation & overflow wrap math
                        const dayCarbs = Math.round(day.entries ? day.entries.reduce((sum, e) => sum + (e.carbs || 0), 0) : 0);
                        const dayFat = Math.round(day.entries ? day.entries.reduce((sum, e) => sum + (e.fat || 0), 0) : 0);
                        const dayMacros = calculateMacroDistribution(effectiveTargetKcal, effectiveTargetProtein);
                        
                        const dayCarbsRawPercent = dayMacros.carbsGrams > 0 ? (dayCarbs / dayMacros.carbsGrams) * 100 : 0;
                        const dayCarbsPercent = Math.min(dayCarbsRawPercent, 100);
                        const dayCarbsOverflowPercent = Math.max(0, Math.min(dayCarbsRawPercent - 100, 100));

                        const dayFatRawPercent = dayMacros.fatGrams > 0 ? (dayFat / dayMacros.fatGrams) * 100 : 0;
                        const dayFatPercent = Math.min(dayFatRawPercent, 100);
                        const dayFatOverflowPercent = Math.max(0, Math.min(dayFatRawPercent - 100, 100));

                        const kcalPill = kcalHit 
                            ? 'bg-green-400/5 text-green-900/70 border-green-400/20' 
                            : kcalOver ? 'bg-signal-red/5 text-red-900/70 border-signal-red/10' : 'bg-white/30 border-transparent text-brutal-black/70';
                            
                        const proPill = proteinHit 
                            ? 'bg-green-400/5 text-green-900/70 border-green-400/20' 
                            : 'bg-white/30 border-transparent text-brutal-black/70';
                        
                        return (
                            <div key={day.dateStr} className="relative w-full">
                                {/* Timeline dot */}
                                <div className={`absolute -left-5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 z-10 ${kcalHit && proteinHit ? 'bg-green-400 border-green-500/20' : kcalOver ? 'bg-signal-red border-signal-red/20' : 'bg-off-white border-brutal-black/10'}`} />
                                
                                <div 
                                    onClick={() => setExpandedHistoryPanel(prev => prev === day.dateStr ? null : day.dateStr)}
                                    className={`relative p-3 rounded-2xl bg-black/5 hover:bg-black/10 transition-colors border border-transparent hover:border-black/5 flex items-center justify-between group cursor-pointer overflow-hidden ${expandedHistoryPanel === day.dateStr ? 'bg-black/10 border-black/10' : ''}`}
                                >
                                    <div className="flex items-baseline gap-2 flex-1 min-w-0 relative z-10">
                                        <span className="font-sans text-[10px] font-bold uppercase text-brutal-black/60 shrink-0 w-8">{dayAbbr}</span>
                                        <span className="font-sans text-[10px] uppercase tracking-wide opacity-50 text-brutal-black shrink-0 truncate">{shortDate}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 shrink-0 relative z-10">
                                        <div className={`flex items-baseline gap-1 px-2 py-1 rounded border ${kcalPill}`}>
                                            <span className="font-data text-sm font-bold">{day.kcal}</span>
                                            <span className="text-[8px] uppercase font-semibold opacity-50 font-sans">Kcal</span>
                                        </div>
                                        <div className={`flex items-baseline gap-1 px-2 py-1 rounded border ${proPill}`}>
                                            <span className="font-data text-sm font-bold">{day.protein}</span>
                                            <span className="text-[8px] uppercase font-semibold opacity-50 font-sans">Pro</span>
                                        </div>
                                        {expandedHistoryPanel === day.dateStr ? (
                                            <ChevronUp size={14} className="opacity-40" />
                                        ) : (
                                            <ChevronDown size={14} className="opacity-20 group-hover:opacity-60 transition-opacity transform group-hover:translate-y-0.5" />
                                        )}
                                    </div>

                                    {/* Bottom flush progress tracks for Carbs & Fat */}
                                    <div className="absolute inset-x-0 bottom-0 h-1.5 bg-black/5 grid grid-cols-2 gap-0.5 pointer-events-none overflow-hidden">
                                        {/* Carbs Bar (Amber) */}
                                        <div className="h-full bg-black/5 overflow-hidden relative">
                                            <div
                                                className="h-full bg-amber-400/40 transition-all duration-500"
                                                style={{ width: `${dayCarbsPercent}%` }}
                                            />
                                            {dayCarbsOverflowPercent > 0 && (
                                                <div
                                                    className="absolute inset-y-0 left-0 h-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,1)] transition-all duration-500"
                                                    style={{ width: `${dayCarbsOverflowPercent}%` }}
                                                />
                                            )}
                                        </div>
                                        {/* Fat Bar (Rose/Red) */}
                                        <div className="h-full bg-black/5 overflow-hidden relative">
                                            <div
                                                className="h-full bg-rose-400/40 transition-all duration-500"
                                                style={{ width: `${dayFatPercent}%` }}
                                            />
                                            {dayFatOverflowPercent > 0 && (
                                                <div
                                                    className="absolute inset-y-0 left-0 h-full bg-rose-600 shadow-[0_0_6px_rgba(225,29,72,1)] transition-all duration-500"
                                                    style={{ width: `${dayFatOverflowPercent}%` }}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Expanded entries layout */}
                                {expandedHistoryPanel === day.dateStr && day.entries && day.entries.length > 0 && (
                                    <div className="mt-2 pl-4 border-l-2 border-black/5 flex flex-col gap-1.5 py-1">
                                        {day.entries.map((yEntry) => {
                                            let yTitle = yEntry.name;
                                            const yStarMatch = yEntry.name.match(/^\*([^*]+)\*/);
                                            if (yStarMatch) {
                                                yTitle = yStarMatch[1];
                                            } else if (yEntry.name.includes('||')) {
                                                yTitle = yEntry.name.split('||')[0].trim();
                                            } else {
                                                const words = yEntry.name.trim().split(/\s+/);
                                                yTitle = words.slice(0, 2).join(' ');
                                            }
                                            
                                            // Handle favorite check
                                            let yNameForFav = yEntry.name;
                                            if (yStarMatch || yEntry.name.includes('||')) {
                                                yNameForFav = yEntry.name;
                                            }
                                            const safeFavorites = favorites || [];
                                            const isFav = safeFavorites.some((f) => f.name === yNameForFav);

                                            return (
                                                <div key={yEntry.id} className="flex items-center justify-between w-full px-3 py-2 bg-white/40 rounded-xl text-left border border-white gap-2 group/entry hover:bg-white/60 transition-colors">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="font-sans text-[9px] font-medium opacity-40 bg-black/5 px-1.5 py-0.5 rounded shrink-0 tabular-nums">
                                                            {new Date(yEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className="font-sans font-semibold text-[11px] leading-tight text-brutal-black truncate capitalize">
                                                            {yTitle}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <div className="flex items-center gap-1 shrink-0 bg-black/5 px-1.5 py-0.5 rounded border border-black/5">
                                                            <span className="font-data text-[11px] font-bold leading-none text-brutal-black">{yEntry.kcal}</span>
                                                            <span className="text-[7px] uppercase font-semibold text-brutal-black/40 font-sans">Kcal</span>
                                                            <span className="text-brutal-black/20 mx-0.5 text-[8px]">/</span>
                                                            <span className="font-data text-[11px] font-bold leading-none text-brutal-black">{yEntry.protein}</span>
                                                            <span className="text-[7px] uppercase font-semibold text-brutal-black/40 font-sans">Pro</span>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isFav) removeFavorite(yNameForFav);
                                                                else addFavorite({ name: yNameForFav, kcal: yEntry.kcal, protein: yEntry.protein, carbs: yEntry.carbs, fat: yEntry.fat });
                                                                playSound(isFav ? 'click' : 'targetHit');
                                                            }}
                                                            className={`p-1 rounded-full transition-colors ${isFav ? 'bg-amber-50 text-amber-500 hover:bg-amber-100' : 'text-brutal-black/20 hover:text-amber-500 hover:bg-black/5'}`}
                                                            title={isFav ? "Remove from Favorites" : "Save as Favorite"}
                                                        >
                                                            <Star size={12} fill={isFav ? 'currentColor' : 'none'} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

        </div>
    );
};

export default DailyLog;
