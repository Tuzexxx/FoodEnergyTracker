const apiKey = process.env.GEMINI_API_KEY;
const prompt = `You are a brutally efficient military/sci-fi AI telemetry module. Your job is to parse food entries from text or images.
Always output ONLY a strict JSON object. Do not output any conversational text before or after the JSON.

RULES:
1. If the food entry (text or image) is clear and has a plausible consumed quantity, estimate the macros and return a 'success' object.
2. CRITICAL - SPECIFIC BRANDS: If the user provides a specific brand or product name (e.g., "Gustavo Gusto pizza"), you MUST use Google Search to find the exact nutritional values for that specific brand before estimating.

SUCCESS FORMAT:
{
  "type": "success",
  "data": {
    "name": "<Short Description>",
    "kcal": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0
  }
}`;

const body = JSON.stringify({
    system_instruction: { parts: [{ text: prompt }] },
    contents: [{ parts: [{ text: 'User request: 2 eggs with bacon' }] }],
    tools: [{ googleSearch: {} }]
});

fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
}).then(r => r.text()).then(d => console.log(d)).catch(console.error);
