export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { input, image } = req.body;
    if (!input && !image) {
        return res.status(400).json({ error: 'Input or image is required' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured', type: 'error' });
        }

        const prompt = `You are a brutally efficient military/sci-fi AI telemetry module. Your job is to parse food entries from text or images.
Always output a strict JSON object. Do not output anything else.
If the food entry is clear enough and has a plausible quantity, assume standard portions and return:
{
  "type": "success",
  "data": {
    "name": "<Short Description (e.g. 2x Scrambled Eggs)>",
    "kcal": <number>,
    "protein": <number in grams>,
    "carbs": <number in grams>,
    "fat": <number in grams>
  }
}
If the food entry is highly ambiguous or completely lacks quantity (e.g., just "chips" or "salad"), return:
{
  "type": "clarification",
  "question": "<Short brutalist question, e.g., 'Incomplete data. Quantify chips.'>",
  "options": ["<Option 1 (e.g., Small 40g)>", "<Option 2>", "<Option 3>"]
}`;

        const parts: any[] = [];

        if (input) {
            parts.push({ text: `User request: ${input}` });
        }

        if (image) {
            const match = image.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
            if (match) {
                parts.push({
                    inline_data: {
                        mime_type: match[1],
                        data: match[2]
                    }
                });
            }
        }

        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: prompt }]
                },
                contents: [{ parts }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.text();
            console.error('Gemini API Error:', errorData);
            return res.status(500).json({ error: 'Gemini API Error', type: 'error' });
        }

        const data = await geminiResponse.json();
        const resultText = data.candidates[0].content.parts[0].text;
        const result = JSON.parse(resultText);

        return res.status(200).json(result);
    } catch (error) {
        console.error('API Route Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', type: 'error' });
    }
}
