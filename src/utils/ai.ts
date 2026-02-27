export const getAiResponse = async (input: string, image?: string) => {
    try {
        const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input, image })
        });

        if (!res.ok) {
            console.error("API Error", await res.text());
            return { type: 'error' };
        }

        return await res.json();
    } catch (e) {
        console.error("Network Error", e);
        return { type: 'error' };
    }
};
