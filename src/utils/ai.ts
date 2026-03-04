export const getAiResponse = async (input: string, image?: string) => {
    const controller = new AbortController();
    // 60s timeout — Gemini + Google Search can be slow on image analysis
    const timeoutId = setTimeout(() => controller.abort(), 60_000);

    try {
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input, image }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            const errorText = await res.text();
            console.error("API Error", errorText);
            try {
                const errorJson = JSON.parse(errorText);
                return { type: 'error', error: errorJson.error || errorJson.message || `Server Error ${res.status}` };
            } catch {
                if (res.status === 504) return { type: 'error', error: 'Vercel Timeout (Model too slow, >10s)' };
                return { type: 'error', error: `Server Error ${res.status}: ${errorText.substring(0, 100)}` };
            }
        }

        return await res.json();
    } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
            console.warn("AI request timed out or was aborted (screen lock?)");
            return { type: 'error', error: 'Request timed out (60s)' };
        }
        console.error("Network Error", e);
        return { type: 'error', error: `Network Error: ${e.message || 'Failed to fetch'}` };
    }
};
