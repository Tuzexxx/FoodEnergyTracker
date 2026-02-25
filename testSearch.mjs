import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

const prompt = `You are a brutally efficient military/sci-fi AI telemetry module. Your job is to parse food entries from text or images.
Always output a strict JSON object. Do not output anything else.

RULES:
1. If the food entry (text or image) is clear and has a plausible consumed quantity, estimate the macros and return a 'success' object.
2. CRITICAL - SPECIFIC BRANDS: If the user provides a specific brand or product name (e.g., "Gustavo Gusto pizza"), you MUST use Google Search to find the exact nutritional values for that specific brand before estimating.
3. CRITICAL - PORTION AMBIGUITY: If an image is provided but the exact portion consumed is ambiguous (e.g., a picture of a whole pizza, a large spread of food, or a generic bowl of pasta without scale), you MUST ask for clarification on how much was actually consumed.
4. CRITICAL - NUTRITION LABELS: If the image is a picture of ingredients or a nutrition label per 100g, but it is unlikely the user ate exactly 100g (or the entire package), you MUST ask for clarification on the precise mass/quantity consumed.
5. If the text entry lacks quantity (e.g., just "chips" or "salad"), you MUST ask for clarification.

SUCCESS FORMAT:
{
  "type": "success",
  "data": {
    "name": "<Short Description (e.g. 2x Scrambled Eggs or 1/2 Pepperoni Pizza)>",
    "kcal": <number>,
    "protein": <number in grams>,
    "carbs": <number in grams>,
    "fat": <number in grams>
  }
}`;

const parts = [
    { text: "User request: Gustavo Gusto pizza" }
];

async function run() {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: prompt }] },
            contents: [{ parts }],
            tools: [{ googleSearch: {} }]
        })
    });

    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}

run();
