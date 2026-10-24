import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, Star, Trash2 } from 'lucide-react';
import { FoodEntry, useStore } from '../store/useStore';
import { getTranslation } from '../utils/i18n';
import { getAiResponse } from '../utils/ai';

export type Meal = Omit<FoodEntry, 'id' | 'timestamp'>;
type Props = {
    entry: Meal & { timestamp?: number };
    mode: 'recent' | 'favorites';
    expanded: boolean;
    pending: boolean;
    isFavorite: boolean;
    onExpand: () => void;
    onAdd: () => void;
    onFavorite: () => void;
    onSave: (entry: Meal) => void;
};

export default function MealPickerCard({ entry, mode, expanded, pending, isFavorite, onExpand, onAdd, onFavorite, onSave }: Props) {
    const language = useStore(state => state.language);
    const favorites = useStore(state => state.favorites);
    const t = getTranslation(language);
    const [draft, setDraft] = useState(entry);
    const [adjusting, setAdjusting] = useState(false);
    const [adjustError, setAdjustError] = useState(false);
    const [offset, setOffset] = useState(0);
    const gesture = useRef<{ x: number; y: number; axis: 'x' | 'y' | null } | null>(null);
    const suppressClick = useRef(false);
    const busy = pending || adjusting;
    useEffect(() => { setDraft(entry); }, [entry]);
    const titleMatch = entry.name.match(/^\*([^*]+)\*\s*([\s\S]*)$/);
    const title = titleMatch?.[1] || entry.name.split('||')[0].trim();
    const details = titleMatch?.[2] || (entry.name.includes('||') ? entry.name.split('||').slice(1).join(' ').trim() : '');
    const fields = ['kcal', 'protein', 'carbs', 'fat'] as const;
    const dirty = draft.name !== entry.name || fields.some(key => draft[key] !== entry[key]);
    const duplicate = draft.name.trim() !== entry.name && favorites.some(item => item.name === draft.name.trim());
    const valid = !!draft.name.trim() && !duplicate && fields.every(key => Number.isFinite(draft[key]) && draft[key] >= 0);
    const favoriteLabel = isFavorite ? t.smartLogging.removeFavorite : t.smartLogging.saveFavorite;
    const direction = mode === 'recent' ? -1 : 1;

    const recalculate = async () => {
        setAdjusting(true);
        setAdjustError(false);
        try {
            const result = await getAiResponse(draft.name);
            if (result.type !== 'success' || !result.data) { setAdjustError(true); return; }
            setDraft(current => ({ ...current, name: result.data.name || current.name,
                kcal: result.data.kcal, protein: result.data.protein, carbs: result.data.carbs, fat: result.data.fat }));
        } catch { setAdjustError(true); }
        finally { setAdjusting(false); }
    };

    return <article className={`relative shrink-0 rounded-2xl border shadow-sm overflow-hidden ${expanded ? 'border-indigo-200' : 'border-black/5'} ${mode === 'recent' ? 'bg-amber-100' : 'bg-red-100'}`}>
        {offset !== 0 && <div aria-hidden="true" className={`absolute inset-x-0 top-0 h-16 px-4 flex items-center ${direction < 0 ? 'justify-end text-amber-700' : 'justify-start text-red-600'}`}>
            {mode === 'recent' ? <Star size={20} /> : <Trash2 size={20} />}
        </div>}
        <div className="relative bg-white transition-transform duration-150 motion-reduce:transition-none" style={{ transform: `translateX(${offset}px)` }}>
            <div className="flex items-center gap-1 p-2">
                <button type="button" disabled={busy} aria-expanded={expanded}
                    aria-label={`${t.smartLogging.mealDetails}: ${title}`}
                    style={{ touchAction: 'pan-y' }}
                    className="flex-1 min-w-0 text-left p-1.5 rounded-xl focus-visible:outline-indigo-500 select-none"
                    onPointerDown={event => {
                        if (event.button !== 0 || !event.isPrimary) return;
                        gesture.current = { x: event.clientX, y: event.clientY, axis: null };
                        suppressClick.current = false;
                        event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={event => {
                        const start = gesture.current;
                        if (!start) return;
                        const dx = event.clientX - start.x, dy = event.clientY - start.y;
                        if (!start.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 10) start.axis = Math.abs(dx) > Math.abs(dy) * 1.5 ? 'x' : 'y';
                        if (start.axis === 'x') setOffset(direction * Math.min(90, Math.max(0, dx * direction)));
                    }}
                    onPointerUp={event => {
                        const start = gesture.current;
                        gesture.current = null;
                        setOffset(0);
                        if (!start) return;
                        const dx = event.clientX - start.x, dy = event.clientY - start.y;
                        suppressClick.current = Math.max(Math.abs(dx), Math.abs(dy)) > 10;
                        if (start.axis === 'x' && dx * direction >= 60 && Math.abs(dx) > Math.abs(dy) * 1.5) onFavorite();
                    }}
                    onPointerCancel={() => { gesture.current = null; setOffset(0); suppressClick.current = true; }}
                    onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } onExpand(); }}>
                    <div className="flex items-center gap-1.5">
                        {isFavorite && <Star size={12} className="shrink-0 text-amber-500 fill-amber-500" />}
                        <span className={`font-bold text-sm min-w-0 ${expanded ? 'break-words' : 'truncate'}`}>{title}</span>
                        <ChevronDown size={14} className={`shrink-0 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </div>
                    <div className="text-[11px] opacity-60 mt-1">
                        {mode === 'recent' && entry.timestamp !== undefined && <>{new Date(entry.timestamp).toLocaleString(language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}{' · '}</>}
                        {entry.kcal} kcal
                    </div>
                </button>
                <button type="button" disabled={busy || dirty} onClick={onAdd} aria-label={`${t.smartLogging.addRecentToday}: ${title}`}
                    className="shrink-0 w-11 h-11 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center justify-center disabled:opacity-40">
                    <Plus size={20} />
                </button>
            </div>
            {expanded && <div className="px-3 pb-3 border-t border-black/5 pt-3">
                {details && <p className="text-xs leading-relaxed whitespace-pre-wrap break-words mb-3">{details}</p>}
                <dl className="grid grid-cols-2 gap-2 text-xs mb-3">
                    {fields.map(key => <div key={key} className="bg-black/[0.03] rounded-xl p-2"><dt className="opacity-60">{t.common[key]}</dt><dd className="font-bold mt-1">{entry[key]} {key === 'kcal' ? 'kcal' : 'g'}</dd></div>)}
                </dl>
                {mode === 'favorites' && <form onSubmit={event => { event.preventDefault(); if (valid && dirty && !busy) onSave({ ...draft, name: draft.name.trim() }); }}>
                    <fieldset disabled={busy} className="space-y-2">
                        <label className="block text-xs">{t.smartLogging.mealDescription}
                            <textarea required value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })}
                                className="mt-1 block w-full rounded-xl bg-black/5 p-2 min-h-20 text-sm" />
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {fields.map(key => <label key={key} className="text-xs">{t.common[key]}
                                <input required min="0" step="any" type="number" value={Number.isNaN(draft[key]) ? '' : draft[key]}
                                    onChange={event => setDraft({ ...draft, [key]: event.target.valueAsNumber })}
                                    className="mt-1 block w-full min-w-0 rounded-xl bg-black/5 p-2 text-sm" />
                            </label>)}
                        </div>
                        {duplicate && <p role="alert" className="text-xs text-red-600">{t.smartLogging.duplicateFavorite}</p>}
                        {adjustError && <p role="alert" className="text-xs text-red-600">{t.smartLogging.pickerError}</p>}
                        <div className="flex flex-wrap gap-2">
                            <button type="button" disabled={!draft.name.trim()} onClick={() => void recalculate()} className="text-xs p-2 rounded-xl bg-indigo-50 text-indigo-600">{adjusting ? t.common.loading : t.common.recalculate}</button>
                            {dirty && <>
                                <button type="button" onClick={() => setDraft(entry)} className="text-xs p-2 rounded-xl bg-black/5">{t.common.cancel}</button>
                                <button type="submit" disabled={!valid} className="text-xs p-2 rounded-xl bg-indigo-600 text-white disabled:opacity-40">{t.common.save}</button>
                            </>}
                        </div>
                    </fieldset>
                </form>}
                <button type="button" disabled={busy} onClick={onFavorite}
                    className={`flex items-center gap-2 mt-3 p-2 rounded-xl text-xs disabled:opacity-40 ${isFavorite ? 'text-red-600 bg-red-50' : 'text-amber-700 bg-amber-50'}`}>
                    {isFavorite ? <Trash2 size={15} /> : <Star size={15} />}{favoriteLabel}
                </button>
            </div>}
        </div>
    </article>;
}
