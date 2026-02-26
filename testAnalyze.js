const fetch = require('node-fetch');

async function test() {
    const apiKey = process.env.GEMINI_API_KEY;
    const body = JSON.stringify({
        system_instruction: { parts: [{ text: "You are an AI." }] },
        contents: [{ parts: [{ text: "Hello" }] }],
        tools: [{ googleSearch: {} }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    status: { type: "STRING" }
                }
            }
        }
    });

    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
    });

    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
}

test();
