import { useEffect, useRef, useState } from 'react';
import { useStore, FoodEntry } from '../store/useStore';
import { Edit2, Check, X, Trash2, Star, Activity, MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react';
import gsap from 'gsap';
import { getAiResponse } from '../utils/ai';

const DailyLog = () => {
    const { dailyLog, updateEntry, deleteEntry, favorites, addFavorite, removeFavorite, historicalDays, targetKcal, targetProtein, processingLogs } = useStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [isProcessing, setIsProcessing] = useState(false);
    const [expandedHistoryDate, setExpandedHistoryDate] = useState<string | null>(null);

    // Brainstorm chat states
    const [chatInputs, setChatInputs] = useState<Record<string, string>>({});
    const [isChatting, setIsChatting] = useState<Record<string, boolean>>({});
    const [chatMessages, setChatMessages] = useState<Record<string, string>>({});

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

    return (
        <div ref={containerRef} className="flex flex-col gap-4 mt-8 pb-32">
            {/* Sticky Timeline Header */}
            <div className="sticky top-16 z-30 -mx-4 px-4 py-3 bg-off-white/80 backdrop-blur-2xl border-b border-brutal-black/5 shadow-sm mb-4">
                <h3 className="font-sans text-xs uppercase tracking-[0.2em] opacity-50 flex items-center justify-between">
                    <span>Timeline</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-brutal-black/30" />
                </h3>
            </div>

            {dailyLog.length === 0 ? (
                <div className="p-8 border-dashed border-brutal-black/20 rounded-2xl bg-black/5 text-center">
                    <p className="font-sans text-sm tracking-widest opacity-60">No entries yet.</p>
                </div>
            ) : (
                <div className="relative flex flex-col gap-4 z-10 pl-4">
                    {/* Vertical Timeline Guide */}
                    <div className="absolute left-0 top-6 bottom-6 w-[1px] bg-brutal-black/10 border-l border-dashed border-brutal-black/20 -z-10" />

                    {/* Pending API Requests */}
                    {processingLogs.map((log) => (
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
                                            <div className="flex justify-between items-center mt-2 border-t border-black/5 pt-3">
                                                <button onClick={() => handleDelete(entry.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-1 text-xs font-sans font-medium">
                                                    <Trash2 size={16} /> Delete
                                                </button>
                                                <div className="flex gap-2 w-full justify-end">
                                                    <button onClick={() => setEditingId(null)} className="p-2 bg-black/5 rounded-xl hover:bg-black/10 transition-colors"><X size={18} /></button>
                                                    <button title="Save Name Only" onClick={() => saveEdit(entry.id, entry.timestamp, false)} disabled={isProcessing} className="px-3 py-2 bg-black/80 text-white rounded-xl hover:bg-black text-[10px] uppercase font-bold tracking-wider transition-colors disabled:opacity-50">
                                                        Save
                                                    </button>
                                                    <button title="Recalculate Macros" onClick={() => saveEdit(entry.id, entry.timestamp, true)} disabled={isProcessing} className="px-3 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 text-[10px] uppercase font-bold tracking-wider transition-colors disabled:opacity-50 flex items-center gap-1">
                                                        {isProcessing ? <Activity size={14} className="animate-spin" /> : <Activity size={14} />} Auto-Adjust
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
                                                            {entry.requiresReview && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); updateEntry(entry.id, { requiresReview: false }); }}
                                                                    className="px-3 py-1.5 transition-colors rounded-full shadow-sm flex items-center justify-center border bg-green-100 text-green-700 border-green-300 hover:bg-green-200 text-[10px] uppercase font-bold tracking-widest gap-1"
                                                                    title="Approve AI Estimation"
                                                                >
                                                                    <Check size={14} strokeWidth={3} /> OK
                                                                </button>
                                                            )}
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
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Historical Summaries */}
            {historicalDays && historicalDays.length > 0 && (
                <div className="mt-4 flex flex-col gap-2">
                    {historicalDays.map((day) => {
                        const isExpanded = expandedHistoryDate === day.dateStr;
                        const dayAbbr = (() => {
                            if (day.dateStr === 'Yesterday') return 'Yest';
                            if (day.entries && day.entries.length > 0) {
                                const d = new Date(Number(day.entries[0].timestamp));
                                return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
                            }
                            return '';
                        })();
                        const shortDate = day.dateStr === 'Yesterday' ? '' : day.dateStr.replace(/, \d{4}$/, '');
                        return (
                            <div key={day.dateStr} className="px-3 py-2 bg-brutal-black/5 rounded-2xl flex items-center justify-between border border-brutal-black/5 transition-all w-full relative">
                                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                                    <span className="font-sans text-[10px] font-bold uppercase text-brutal-black/60 shrink-0 w-8">{dayAbbr}</span>
                                    <span className="font-sans text-[9px] uppercase tracking-wide opacity-40 text-brutal-black shrink-0">{shortDate}</span>
                                    <div className="flex items-center ml-auto shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                                        <span className={`font-data text-xs font-bold text-right w-10 ${day.kcal > targetKcal ? 'text-red-500' : 'text-brutal-black'}`}>{day.kcal}</span>
                                        <span className="font-sans text-[8px] opacity-40 text-brutal-black w-10">/{targetKcal}</span>
                                        <span className="text-brutal-black/15 text-[10px] mx-0.5">│</span>
                                        <span className={`font-data text-xs font-bold text-right w-10 ${day.protein < targetProtein ? 'text-red-500' : 'text-brutal-black'}`}>{day.protein}g</span>
                                        <span className="font-sans text-[8px] opacity-40 text-brutal-black w-10">/{targetProtein}g</span>
                                    </div>
                                </div>
                                {day.entries && day.entries.length > 0 && (
                                    <button
                                        onClick={() => setExpandedHistoryDate(isExpanded ? null : day.dateStr)}
                                        className="p-1.5 rounded-full hover:bg-black/5 transition-colors text-brutal-black/50 shrink-0 ml-2"
                                        title={isExpanded ? "Hide Details" : "View Details"}
                                    >
                                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                )}

                                {day.entries && day.entries.length > 0 && isExpanded && (
                                    <div className="absolute top-full left-0 w-full mt-1 flex flex-col items-center bg-white/40 rounded-xl p-2 z-10 border border-white/50 shadow-sm backdrop-blur-md">
                                        <div className="w-full mt-3 flex flex-col items-center">
                                            <div className="w-full mt-1 flex flex-col gap-1.5 overflow-hidden animate-in slide-in-from-top-4 fade-in duration-300">
                                                {day.entries.map((yEntry) => {
                                                    let yTitle = yEntry.name;
                                                    if (yEntry.name.includes('||')) {
                                                        yTitle = yEntry.name.split('||')[1] || yEntry.name.split('||')[0];
                                                    } else {
                                                        const words = yEntry.name.trim().split(/\s+/);
                                                        if (words.length > 1) {
                                                            yTitle = words[0];
                                                        }
                                                    }
                                                    let yNameForFav = yEntry.name;
                                                    if (yEntry.name.includes('||')) {
                                                        yNameForFav = yEntry.name.split('||')[1] || yEntry.name.split('||')[0];
                                                    }
                                                    const isFav = favorites.some((f) => f.name === yNameForFav);

                                                    const handleFavToggle = (e: React.MouseEvent) => {
                                                        e.stopPropagation();
                                                        if (isFav) {
                                                            removeFavorite(yNameForFav);
                                                        } else {
                                                            addFavorite({
                                                                name: yNameForFav,
                                                                kcal: yEntry.kcal,
                                                                protein: yEntry.protein,
                                                                carbs: yEntry.carbs,
                                                                fat: yEntry.fat
                                                            });
                                                        }
                                                    };

                                                    return (
                                                        <div key={yEntry.id} className="flex items-center w-full px-2 py-1.5 bg-white/40 rounded-lg text-left border border-white gap-2">
                                                            <span className="font-sans text-[8px] font-medium opacity-40 bg-black/5 px-1 rounded shrink-0">
                                                                {new Date(yEntry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            <button
                                                                onClick={handleFavToggle}
                                                                className={`shrink-0 hover:scale-110 active:scale-95 transition-transform ${isFav ? 'text-amber-400' : 'text-brutal-black/20 hover:text-amber-400/50'}`}
                                                                title={isFav ? "Remove from Favorites" : "Save as Favorite"}
                                                            >
                                                                <Star size={10} className={isFav ? "fill-amber-400" : ""} />
                                                            </button>
                                                            <span className="font-sans font-semibold text-[10px] leading-tight text-brutal-black flex-1 truncate capitalize">
                                                                {yTitle}
                                                            </span>
                                                            <div className="flex items-center gap-1 shrink-0 bg-black/5 px-1.5 py-0.5 rounded border border-black/5 ml-auto">
                                                                <span className="font-data text-[10px] font-bold leading-none text-brutal-black">{yEntry.kcal}</span>
                                                                <span className="text-[7px] uppercase font-semibold text-brutal-black/40 font-sans">Kcal</span>
                                                                <span className="text-brutal-black/20 mx-0.5 text-[8px]">/</span>
                                                                <span className="font-data text-[10px] font-bold leading-none text-brutal-black">{yEntry.protein}</span>
                                                                <span className="text-[7px] uppercase font-semibold text-brutal-black/40 font-sans">Pro</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
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
