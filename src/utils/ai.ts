import { useStore } from '../store/useStore';
import { isSupabaseConfigured, supabase } from './supabase';

export const getAiResponse = async (input: string, image?: string) => {
    const controller = new AbortController();
    // 60s timeout — Gemini + Google Search can be slow on image analysis
    const timeoutId = setTimeout(() => controller.abort(), 60_000);

    // Client-side exact match cache bypass for frequent foods
        if (!image && input && input.trim()) {
        const normalizeStr = (str: string) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        const normSearch = normalizeStr(input);
        const { favorites, dailyLog, historicalDays } = useStore.getState();

        const findMatch = (entries: any[]) => entries.find(e => {
            if (!e.name) return false;
            const normRaw = normalizeStr(e.name);
            if (normRaw === normSearch) return true;

            const descMatch = e.name.match(/^\*[^\*]+\*\s*(.*)$/);
            if (descMatch && normalizeStr(descMatch[1]) === normSearch) return true;

            const titleMatch = e.name.match(/^\*([^\*]+)\*/);
            if (titleMatch && normalizeStr(titleMatch[1]) === normSearch) return true;

            return false;
        });

const favMatch = findMatch(favorites);
        if (favMatch) {
            console.log("CACHE HIT: Found in Favorites!");
            return { type: 'success', data: { kcal: favMatch.kcal, protein: favMatch.protein, carbs: favMatch.carbs, fat: favMatch.fat, name: favMatch.name } };
        }

        const dailyMatch = findMatch(dailyLog);
        if (dailyMatch) {
            console.log("CACHE HIT: Found in Today's Log!");
            return { type: 'success', data: { kcal: dailyMatch.kcal, protein: dailyMatch.protein, carbs: dailyMatch.carbs, fat: dailyMatch.fat, name: dailyMatch.name } };
        }

        for (const hDay of historicalDays) {
            const hMatch = findMatch(hDay.entries);
            if (hMatch) {
                console.log("CACHE HIT: Found in History!");
                return { type: 'success', data: { kcal: hMatch.kcal, protein: hMatch.protein, carbs: hMatch.carbs, fat: hMatch.fat, name: hMatch.name } };
            }
        }
    }

    try {
        const { data: { session } } = isSupabaseConfigured
            ? await supabase.auth.getSession()
            : { data: { session: null } };
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
            headers.Authorization = `Bearer ${session.access_token}`;
        } else {
            headers['X-Client-Mode'] = 'guest';
        }

        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers,
            body: JSON.stringify({ input, image }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            const errorText = await res.text();
            console.error("API Error", errorText);
            try {
                const errorJson = JSON.parse(errorText);
                return {
                    type: 'error',
                    error: errorJson.error || errorJson.message || `Server Error ${res.status}`,
                    retryable: res.status === 429 || res.status >= 500,
                };
            } catch {
                if (res.status === 504) return { type: 'error', error: 'Server timeout. Please retry.', retryable: true };
                return {
                    type: 'error',
                    error: `Server Error ${res.status}`,
                    retryable: res.status === 429 || res.status >= 500,
                };
            }
        }

        return await res.json();
    } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
            console.warn("AI request timed out or was aborted (screen lock?)");
            return { type: 'error', error: 'Request timed out. It will retry when the app resumes.', retryable: true };
        }
        console.error("Network Error", e);
        return { type: 'error', error: 'Network error. It will retry when the app resumes.', retryable: true };
    }
};
