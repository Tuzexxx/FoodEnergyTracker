import { useEffect, useMemo, useRef, useState } from 'react';
import { History, Star, X } from 'lucide-react';
import { FoodEntry, useStore } from '../store/useStore';
import { getTranslation } from '../utils/i18n';
import { playSound } from '../utils/audio';
import MealPickerCard, { Meal } from './MealPickerCard';

export default function MealPicker({ mode, onClose }: { mode: 'recent' | 'favorites'; onClose: () => void }) {
    const { dailyLog, historicalDays, language, addEntry, checkDayRollover, setViewedHistoryDate, favorites, addFavorite, removeFavorite, updateFavorite } = useStore();
    const t = getTranslation(language);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState(false);
    const adding = useRef(false);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [removed, setRemoved] = useState<Meal | null>(null);
    const panelId = `${mode}-meals`;
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

    const addMeal = async (entry: Meal) => {
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

    const changeFavorite = async (entry: Meal, remove: boolean) => {
        if (adding.current) return;
        adding.current = true;
        setPending(true);
        setError(false);
        try {
            if (remove) await removeFavorite(entry.name);
            else await addFavorite({ name: entry.name, kcal: entry.kcal, protein: entry.protein, carbs: entry.carbs, fat: entry.fat, requiresReview: entry.requiresReview });
            const exists = useStore.getState().favorites.some(item => item.name === entry.name);
            if (exists === remove) setError(true);
            else setRemoved(remove ? entry : null);
        } catch { setError(true); }
        finally { adding.current = false; setPending(false); }
    };

    const saveFavorite = async (original: Meal, updated: Meal) => {
        if (adding.current) return;
        adding.current = true;
        setPending(true);
        setError(false);
        try {
            await updateFavorite(original.name, updated);
            const saved = useStore.getState().favorites.some(item =>
                item.name === updated.name && item.kcal === updated.kcal && item.protein === updated.protein &&
                item.carbs === updated.carbs && item.fat === updated.fat);
            if (!saved) setError(true);
            else setExpanded(updated.name);
        } catch { setError(true); }
        finally { adding.current = false; setPending(false); }
    };
    const items = mode === 'recent' ? entries : favorites;

    return <>
        <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-xl" onClick={onClose} />
        <section id={panelId} aria-labelledby={`${panelId}-title`} aria-busy={pending}
            className="relative z-40 w-full max-w-sm mx-auto px-1 pb-2 mb-1">
            <div className="bg-white/90 backdrop-blur-2xl border border-white/50 rounded-3xl shadow-2xl p-2.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 id={`${panelId}-title`} className="flex items-center gap-2 font-bold text-sm">
                        {mode === 'recent' ? <History size={17} className="text-indigo-600" /> : <Star size={17} className="text-amber-500" />}
                        {mode === 'recent' ? t.smartLogging.recent : t.smartLogging.favoritesTitle}
                    </h3>
                    <button ref={closeButton} onClick={onClose} aria-label={t.common.cancel}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-black/5">
                        <X size={18} />
                    </button>
                </div>
                <p className="text-[11px] opacity-60 mb-2 leading-tight">{mode === 'recent' ? t.smartLogging.recentHint : t.smartLogging.favoritesHint}</p>
                {error && <p role="alert" className="text-sm text-red-600 mb-2">{t.smartLogging.pickerError}</p>}
                {removed && <div role="status" className="flex items-center justify-between gap-2 text-xs bg-amber-50 p-2 rounded-xl mb-2">
                    <span>{t.smartLogging.favoriteRemoved}</span>
                    <button disabled={pending} className="font-bold p-2 text-indigo-600" onClick={() => void changeFavorite(removed, false)}>{t.smartLogging.undo}</button>
                </div>}
                <div className="flex flex-col gap-1.5 max-h-[45vh] overflow-y-auto overscroll-contain custom-scrollbar">
                    {items.length === 0 && <p className="text-sm opacity-60 py-3">{mode === 'recent' ? t.smartLogging.recentEmpty : t.smartLogging.favEmpty}</p>}
                    {items.map(entry => {
                        const key = mode === 'recent' ? (entry as FoodEntry).id : entry.name;
                        const isFavorite = favorites.some(item => item.name === entry.name);
                        return <MealPickerCard key={key} entry={entry} mode={mode} expanded={expanded === key}
                            pending={pending} isFavorite={isFavorite}
                            onExpand={() => setExpanded(expanded === key ? null : key)}
                            onAdd={() => void addMeal(entry)}
                            onFavorite={() => void changeFavorite(entry, isFavorite)}
                            onSave={updated => void saveFavorite(entry, updated)} />;
                    })}
                </div>
            </div>
        </section>
    </>;
}
