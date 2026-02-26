const apiKey = process.env.GEMINI_API_KEY;
const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const prompt = `You are a brutally efficient military/sci-fi AI telemetry module. Your job is to parse food entries from text or images.
Always output ONLY a strict JSON object. Do not output any conversational text before or after the JSON.`;

const body = JSON.stringify({
    system_instruction: { parts: [{ text: prompt }] },
    contents: [{ parts: [{ text: 'a' }, { inline_data: { mime_type: 'image/png', data: base64Image } }] }],
    tools: [{ googleSearch: {} }]
});

fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2))).catch(console.error);
