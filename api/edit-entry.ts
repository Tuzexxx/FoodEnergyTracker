import { guardRequest, isValidMacroResult, validateEditBody, ApiRequest, ApiResponse } from './_security';

export default async function handler(req: ApiRequest & { method?: string }, res: ApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (await guardRequest(req, res) === null) return;
    const validated = validateEditBody(req.body);
    if ('error' in validated) return res.status(400).json({ error: validated.error });
    const { entry, message } = validated;

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
1. CRITICAL: The 'data' object in your response must contain the FINAL ABSOLUTE TOTAL macros AFTER your modification — NOT a delta or addition. Example: if the current entry is 300 kcal and the user says "I only had half", return kcal: 150 (not 450).
2. Modify the macros and/or name based on the user's instructions (e.g. if they say "I had half", cut all macros roughly in half. If they say "add 1 egg", add the egg's macros to the current totals and return the new combined total).
3. DO NOT output conversational text outside the JSON.
4. Include a short, brutalist confirmation message in 'aiMessage' explaining what you changed (e.g. "Halved the portion. Macros updated.").
5. Update the name to reflect the new state if appropriate (e.g. "Salad (Half portion)"). Keep the '*Title*' format.

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

                const MODELS = [
            'gemini-3.5-flash',
            'gemini-3.5-flash-lite',
            'gemini-3.1-flash-lite',
            'gemini-2.5-flash-lite',
        ];

        const requestBody = JSON.stringify({
            system_instruction: {
                parts: [{ text: "Output strictly JSON format." }]
            },
            contents: [{
                parts: [{ text: prompt }]
            }],
            tools: [{ googleSearch: {} }],
            generationConfig: { responseMimeType: 'application/json' },
        });

        let geminiResponse: Response | null = null;
        let lastError = '';

                for (const model of MODELS) {
            console.log(`[edit-entry] Trying model: ${model}`);
            try {
                const resp = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: requestBody,
                    }
                );

                if (resp.ok) {
                    geminiResponse = resp;
                    break;
                }

                lastError = await resp.text();
                console.warn(`[edit-entry] Model ${model} failed (${resp.status}):`, lastError);
            } catch (err: any) {
                lastError = err.message || String(err);
                console.warn(`[edit-entry] Model ${model} exception:`, lastError);
            }
        }

        if (!geminiResponse) {
            return res.status(503).json({ error: 'All AI models unavailable', type: 'error' });
        }

        const data: any = await geminiResponse.json();
        const candidate = data.candidates?.[0];
        if (!candidate || !candidate.content || !candidate.content.parts) {
            return res.status(500).json({ error: 'Unexpected response format from AI', type: 'error' });
        }

        const textPart = candidate.content.parts.find((p: any) => p.text);
        if (!textPart) {
            return res.status(500).json({ error: 'No text returned from AI', type: 'error' });
        }

        const resultText = textPart.text;
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
        } catch {
            console.warn("Gemini output was not valid JSON.", resultText);
            return res.status(400).json({ error: "Failed to parse AI modifications." });
        }

        if (result?.type === 'success' && !isValidMacroResult(result)) {
            return res.status(502).json({ error: 'AI returned invalid macro values.', type: 'error' });
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('API Route Error:', error.message || error);
        return res.status(500).json({ error: 'Internal Server Error', type: 'error' });
    }
}
