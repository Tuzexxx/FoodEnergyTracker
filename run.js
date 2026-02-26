const apiKey = process.env.GEMINI_API_KEY;
const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const body = JSON.stringify({
    contents: [{ parts: [{ text: 'a' }, { inline_data: { mime_type: 'image/png', data: base64Image } }] }],
    tools: [{ googleSearch: {} }]
});

fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
}).then(r => r.text()).then(d => console.log(d)).catch(console.error);
