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
            console.error("API Error", await res.text());
            return { type: 'error' };
        }

        return await res.json();
    } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
            console.warn("AI request timed out or was aborted (screen lock?)");
            return { type: 'error', reason: 'aborted' };
        }
        console.error("Network Error", e);
        return { type: 'error', reason: 'network' };
    }
};
