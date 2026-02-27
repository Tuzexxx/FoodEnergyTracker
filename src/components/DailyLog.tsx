import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { Edit2, Check, X, Trash2, Star, Activity } from 'lucide-react';
import gsap from 'gsap';
import { getAiResponse } from '../utils/ai';

const DailyLog = () => {
    const { dailyLog, updateEntry, deleteEntry, favorites, addFavorite, removeFavorite, yesterdayKcal, yesterdayProtein, targetKcal, targetProtein } = useStore();
    const containerRef = useRef<HTMLDivElement>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
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
            const wantsRecalc = window.confirm("Změnili jste název. Chcete podle něj nechat AI znovu přepočítat hodnoty? (Jinak zůstanou současná čísla)");
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
                    alert("AI potřebuje upřesnění. Hodnoty zůstanou původní, upravte je ručně.");
                } else {
                    alert("Chyba při komunikaci s AI. Hodnoty zůstanou původní.");
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
            <h3 className="font-sans text-sm uppercase tracking-widest opacity-50 mb-2 sticky top-20 z-20 bg-off-white/80 backdrop-blur py-2 mix-blend-multiply">
                Daily Archive Sequences
            </h3>

            {dailyLog.length === 0 ? (
                <div className="brutal-card p-8 border-dashed border-brutal-black/20 bg-transparent opacity-50 text-center">
                    <p className="font-sans text-sm uppercase tracking-widest">No telemetry recorded</p>
                    <div className="w-8 h-[1px] bg-brutal-black/30 mx-auto mt-4"></div>
                </div>
            ) : (
                <div className="flex flex-col gap-3 relative z-10">
                    {dailyLog.map((entry) => (
                        <div
                            key={entry.id}
                            className={`log-card brutal-card p-5 transition-all duration-300 border bg-paper group relative ${entry.requiresReview ? 'border-signal-red border-dashed' : 'border-transparent hover:border-brutal-black/30'}`}
                        >
                            {editingId === entry.id ? (
                                <div className="flex flex-col gap-3">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            className="font-sans font-medium text-lg leading-tight bg-black/5 p-2 rounded-lg outline-none flex-1"
                                        />
                                        <input
                                            type="time"
                                            value={editForm.time}
                                            onChange={(e) => setEditForm({ ...editForm, time: e.target.value })}
                                            className="font-sans font-medium text-lg leading-tight bg-black/5 p-2 rounded-lg outline-none w-24 shrink-0 text-center"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        <div>
                                            <label className="text-[10px] uppercase opacity-50 block mb-1">Kcal</label>
                                            <input type="number" value={editForm.kcal} onChange={(e) => setEditForm({ ...editForm, kcal: e.target.value })} className="w-full bg-black/5 p-2 rounded outline-none font-data" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase opacity-50 block mb-1">Pro</label>
                                            <input type="number" value={editForm.protein} onChange={(e) => setEditForm({ ...editForm, protein: e.target.value })} className="w-full bg-black/5 p-2 rounded outline-none font-data" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase opacity-50 block mb-1">Carb</label>
                                            <input type="number" value={editForm.carbs} onChange={(e) => setEditForm({ ...editForm, carbs: e.target.value })} className="w-full bg-black/5 p-2 rounded outline-none font-data" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase opacity-50 block mb-1">Fat</label>
                                            <input type="number" value={editForm.fat} onChange={(e) => setEditForm({ ...editForm, fat: e.target.value })} className="w-full bg-black/5 p-2 rounded outline-none font-data" />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center mt-2 border-t border-black/10 pt-3">
                                        <button onClick={() => handleDelete(entry.id)} className="p-2 text-signal-red hover:bg-signal-red/10 rounded transition-colors flex items-center gap-1 text-xs tracking-widest uppercase font-sans font-bold">
                                            <Trash2 size={14} /> Delete
                                        </button>
                                        <div className="flex gap-2">
                                            <button onClick={() => setEditingId(null)} className="p-2 bg-black/5 rounded hover:bg-black/10 transition-colors">
                                                <X size={16} />
                                            </button>
                                            <button onClick={() => saveEdit(entry.id, entry.timestamp)} disabled={isProcessing} className="p-2 bg-signal-red text-white rounded hover:bg-signal-red/80 transition-colors disabled:opacity-50">
                                                {isProcessing ? <Activity size={16} className="animate-spin" /> : <Check size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center relative">
                                    <button
                                        onClick={() => startEdit(entry)}
                                        className={`absolute -top-4 -right-2 p-3 transition-all rounded-full z-10 flex items-center justify-center ${entry.requiresReview
                                            ? 'bg-signal-red text-off-white shadow-md animate-pulse opacity-100 scale-[1.15]'
                                            : 'text-brutal-black/50 hover:text-signal-red opacity-100 bg-black/5 hover:bg-black/10'
                                            }`}
                                        title="Edit Entry"
                                    >
                                        <Edit2 size={16} strokeWidth={entry.requiresReview ? 2.5 : 2} />
                                    </button>

                                    <div className="pr-8 pt-1">
                                        <div className="flex items-start gap-2 mb-1">
                                            <button
                                                onClick={() => {
                                                    const safeFavorites = favorites || [];
                                                    const isFav = safeFavorites.some(f => f.name === entry.name);
                                                    if (isFav) removeFavorite(entry.name);
                                                    else addFavorite({ name: entry.name, kcal: entry.kcal, protein: entry.protein, carbs: entry.carbs, fat: entry.fat });
                                                }}
                                                className={`mt-1 transition-colors ${(favorites || []).some(f => f.name === entry.name) ? 'text-[#F5B041]' : 'text-brutal-black/20 hover:text-[#F5B041]'}`}
                                                title="Favorite"
                                            >
                                                <Star size={16} fill={(favorites || []).some(f => f.name === entry.name) ? 'currentColor' : 'none'} />
                                            </button>
                                            <div className="flex flex-col">
                                                <p className="font-sans font-medium text-lg leading-tight">
                                                    {entry.name.includes('||') ? entry.name.split('||')[0] : entry.name}
                                                </p>
                                                {entry.name.includes('||') && (
                                                    <p className="font-sans text-[11px] opacity-60 leading-tight mt-0.5 pr-2">
                                                        {entry.name.substring(entry.name.indexOf('||') + 2)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-data text-xs opacity-50 tracking-widest">
                                                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right flex flex-col items-end shrink-0">
                                        <div className="flex items-baseline gap-1">
                                            <p className="font-data text-2xl tracking-tighter leading-none">{entry.kcal}</p>
                                            <span className="text-[9px] uppercase tracking-widest text-signal-red font-sans">KCAL</span>
                                        </div>

                                        <div className="flex gap-3 font-data text-[10px] opacity-40 mt-2 border-t border-brutal-black/10 pt-1">
                                            <span className="flex gap-1">
                                                <span className="opacity-50">P</span>{entry.protein}
                                            </span>
                                            <span className="flex gap-1">
                                                <span className="opacity-50">C</span>{entry.carbs}
                                            </span>
                                            <span className="flex gap-1">
                                                <span className="opacity-50">F</span>{entry.fat}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Yesterday 's Summary */}
            {(yesterdayKcal > 0 || yesterdayProtein > 0) && (
                <div className="mt-8 brutal-card p-4 bg-black/5 border border-black/10 flex flex-col items-center justify-center text-center opacity-80">
                    <h4 className="font-sans text-xs uppercase tracking-widest opacity-50 mb-2">Předchozí den</h4>
                    <div className="flex items-center gap-4">
                        <div className="flex items-baseline gap-1">
                            <span className={`font-data text-xl ${yesterdayKcal > targetKcal ? 'text-signal-red' : ''}`}>{yesterdayKcal}</span>
                            <span className="font-sans text-[10px] uppercase opacity-60">/ {targetKcal} kcal</span>
                        </div>
                        <div className="w-[1px] h-4 bg-black/20" />
                        <div className="flex items-baseline gap-1">
                            <span className="font-data text-xl">{yesterdayProtein}</span>
                            <span className="font-sans text-[10px] uppercase opacity-60">/ {targetProtein}g pro</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyLog;
