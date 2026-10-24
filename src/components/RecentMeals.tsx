import { useEffect, useMemo, useRef, useState } from 'react';
import { History, Plus, X } from 'lucide-react';
import { FoodEntry, useStore } from '../store/useStore';
import { getTranslation } from '../utils/i18n';
import { playSound } from '../utils/audio';

export default function RecentMeals({ onClose }: { onClose: () => void }) {
    const { dailyLog, historicalDays, language, addEntry, checkDayRollover, setViewedHistoryDate } = useStore();
    const t = getTranslation(language);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState(false);
    const adding = useRef(false);
    const closeButton = useRef<HTMLButtonElement>(null);
    const entries = useMemo(() => {
        // Deduplicate identities only: repeated meals remain separate history entries.
        const unique = new Map<string, FoodEntry>();
        for (const entry of [...dailyLog, ...historicalDays.flatMap(day => day.entries || [])]) {
            if (!unique.has(entry.id)) unique.set(entry.id, entry);
        }
        return [...unique.values()].sort((a, b) => b.timestamp - a.timestamp);
    }, [dailyLog, historicalDays]);

    useEffect(() => {
        const previousFocus = document.activeElement as HTMLElement | null;
        closeButton.current?.focus();
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            previousFocus?.focus();
        };
    }, [onClose]);

    const addMeal = async (entry: FoodEntry) => {
        if (adding.current) return;
        adding.current = true;
        setPending(true);
        setError(false);
        checkDayRollover();
        const previousIds = new Set(useStore.getState().dailyLog.map(item => item.id));
        try {
            // Copy the original portion and macros; addEntry supplies a fresh ID and current time.
            await addEntry({
                name: entry.name, kcal: entry.kcal, protein: entry.protein,
                carbs: entry.carbs, fat: entry.fat, requiresReview: entry.requiresReview,
            });
            // addEntry rolls back locally on a cloud error rather than throwing.
            const saved = useStore.getState().dailyLog.some(item => !previousIds.has(item.id) && item.name === entry.name);
            if (!saved) {
                setError(true);
                return;
            }
            setViewedHistoryDate(null);
            playSound('targetHit');
            onClose();
        } catch {
            setError(true);
        } finally {
            adding.current = false;
            setPending(false);
        }
    };

    return <>
        <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-xl" onClick={onClose} />
        <section id="recent-meals" aria-labelledby="recent-meals-title" aria-busy={pending}
            className="relative z-40 w-full max-w-sm mx-auto px-2 pb-4 mb-2">
            <div className="bg-white/90 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-2xl p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 id="recent-meals-title" className="flex items-center gap-2 font-bold text-sm">
                        <History size={17} className="text-indigo-600" />{t.smartLogging.recent}
                    </h3>
                    <button ref={closeButton} onClick={onClose} aria-label={t.common.cancel}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5">
                        <X size={18} />
                    </button>
                </div>
                {error && <p role="alert" className="text-sm text-red-600 mb-2">{t.smartLogging.recentError}</p>}
                <div className="flex flex-col gap-2 max-h-[45vh] overflow-y-auto overscroll-contain custom-scrollbar">
                    {entries.length === 0 && <p className="text-sm opacity-60 py-3">{t.smartLogging.recentEmpty}</p>}
                    {entries.map(entry => {
                        const title = entry.name.match(/^\*([^*]+)\*/)?.[1] || entry.name.split('||')[0].trim();
                        return <button key={entry.id} disabled={pending} onClick={() => void addMeal(entry)}
                            aria-label={`${t.smartLogging.addRecentToday}: ${title}`}
                            title={`${t.smartLogging.addRecentToday}: ${entry.name}`}
                            className="flex items-center gap-3 w-full rounded-2xl bg-white border border-black/5 p-3 text-left shadow-sm hover:bg-indigo-50 active:scale-[0.98] disabled:opacity-50 transition-all">
                            <div className="min-w-0 flex-1">
                                <div className="font-bold text-sm truncate">{title}</div>
                                <div className="text-[11px] opacity-60 mt-1">
                                    {new Date(entry.timestamp).toLocaleString(language, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    {' · '}{entry.kcal} kcal
                                </div>
                            </div>
                            <Plus size={18} className="text-indigo-600 shrink-0" />
                        </button>;
                    })}
                </div>
            </div>
        </section>
    </>;
}
