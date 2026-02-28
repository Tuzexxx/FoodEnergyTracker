export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { entry, message } = req.body;
    if (!entry || !message) {
        return res.status(400).json({ error: 'Entry and message are required' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured', type: 'error' });
        }

        const prompt = `You are a brutally efficient military/sci-fi AI telemetry module. Your job is to modify an existing food entry based on the user's instructions.
        
User Instruction: "${message}"

Current Entry Data:
Name: ${entry.name}
Kcal: ${entry.kcal}
Protein (g): ${entry.protein}
Carbs (g): ${entry.carbs}
Fat (g): ${entry.fat}

RULES:
1. Modify the macros and/or name based on the user's instructions (e.g. if they say "I had half", cut all macros roughly in half. If they say "add 1 egg", add the macros of 1 egg).
2. DO NOT output conversational text outside the JSON.
3. Include a short, brutalist confirmation message in 'aiMessage' explaining what you changed (e.g. "Halved the portion. Macros updated.").
4. Update the name to reflect the new state if appropriate (e.g. "Salad (Half portion)"). Keep the '||' separator logic.

SUCCESS FORMAT:
{
  "type": "success",
  "aiMessage": "<Short confirmation message>",
  "data": {
    "name": "<Updated Name>",
    "kcal": <number>,
    "protein": <number in grams>,
    "carbs": <number in grams>,
    "fat": <number in grams>,
    "requiresReview": false
  }
}`;

        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: "Output strictly JSON format." }]
                },
                contents: [{
                    parts: [{ text: prompt }]
                }],
                tools: [{ googleSearch: {} }]
            })
        });

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.text();
            console.error('Gemini API Error:', errorData);
            return res.status(500).json({ error: 'Gemini API Error', type: 'error' });
        }

        const data = await geminiResponse.json();
        const candidate = data.candidates?.[0];
        if (!candidate || !candidate.content || !candidate.content.parts) {
            return res.status(500).json({ error: 'Unexpected response format from AI', type: 'error' });
        }

        const textPart = candidate.content.parts.find((p: any) => p.text);
        if (!textPart) {
            return res.status(500).json({ error: 'No text returned from AI', type: 'error' });
        }

        let resultText = textPart.text;
        let result;

        try {
            const firstBrace = resultText.indexOf('{');
            const lastBrace = resultText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
                const jsonString = resultText.substring(firstBrace, lastBrace + 1);
                result = JSON.parse(jsonString);
            } else {
                throw new Error("No JSON object braces found in response");
            }
        } catch (parseError) {
            console.warn("Gemini output was not valid JSON.", resultText);
            return res.status(400).json({ error: "Failed to parse AI modifications." });
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('API Route Error:', error.message || error);
        return res.status(500).json({ error: 'Internal Server Error', type: 'error', details: error.message });
    }
}
