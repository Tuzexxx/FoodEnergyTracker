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
Always output ONLY a strict JSON object. Do not output any conversational text before or after the JSON.

RULES:
1. If the food entry (text or image) is clear and has a plausible consumed quantity, estimate the macros and set 'requiresReview' to false.
2. CRITICAL - SPECIFIC BRANDS: If the user provides a specific brand or product name (e.g., "Gustavo Gusto pizza"), you MUST use Google Search to find the exact nutritional values for that specific brand before estimating.
3. CRITICAL - AMBIGUITY & GRACEFUL ASSUMPTION: If the portion is ambiguous (e.g., "salad" or an image without scale), DO NOT ask for clarification. Make a mathematically sound, educated guess based on statistical average portion sizes (e.g., "1 average medium bowl of mixed salad (approx 300g)"). If you have to make an assumption like this, you MUST set the 'requiresReview' flag to true.
4. If an image is just ingredients or a nutrition label per 100g, assume a standard single serving size for that food type and set 'requiresReview' to true.
5. CRITICAL - ALWAYS USE METRIC: The description after the '*Title*' marker MUST ALWAYS include precise metric weights (grams or ml). Never just say "1 bowl" or "2 pieces" without adding "(approx Xg)" or "(X ml)".
6. CRITICAL - 1-WORD SUMMARY: The 'name' field MUST ALWAYS exactly consist of an asterisk-wrapped SINGLE-WORD English summary, immediately followed by a space and then the user's specific original input or your assumed serving description WITH METRICS (Grams/ml). 
   Example 1 (Czech input): "*Banana* dvou banány k snídani (approx 240g)" 
   Example 2 (English input): "*Salad* 1 average medium bowl of mixed salad (approx 300g)"
   Example 3 (Czech input): "*Egg* 3 michana vajicka na masle (approx 180g)"

SUCCESS FORMAT:
{
  "type": "success",
  "data": {
    "name": "*<ShortTitle>* <Original Input or Assumed Description>",
    "kcal": <number>,
    "protein": <number in grams>,
    "carbs": <number in grams>,
    "fat": <number in grams>,
    "requiresReview": <boolean>
  }
}

CLARIFICATION FORMAT:
(Use ONLY for fundamentally unparseable requests or non-food images, NOT for portion ambiguity)
{
  "type": "clarification",
  "question": "<Short brutalist question>",
  "options": ["<Option 1>", "<Option 2>", "<Option 3>"]
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

        const MODELS = [
            'gemini-3.1-flash-lite-preview',  // Primary: user-preferred
            'gemini-3-flash-preview',          // Fallback 1
            'gemini-2.5-flash-lite',           // Fallback 2: stable
        ];

        const requestBody = JSON.stringify({
            system_instruction: {
                parts: [{ text: prompt }]
            },
            contents: [{ parts }],
            tools: [{ googleSearch: {} }]
        });

        let geminiResponse: Response | null = null;
        let lastError = '';

        for (const model of MODELS) {
            console.log(`[analyze] Trying model: ${model}`);
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

            // Retryable errors: 503 (overloaded), 429 (rate-limit)
            lastError = await resp.text();
            console.warn(`[analyze] Model ${model} failed (${resp.status}):`, lastError);

            if (resp.status === 503 || resp.status === 429) {
                console.log(`[analyze] Retryable error, falling back to next model...`);
                continue;
            }

            // Non-retryable error — stop immediately
            return res.status(500).json({ error: `Gemini API Error (${resp.status}): ${lastError.substring(0, 200)}`, type: 'error' });
        }

        if (!geminiResponse) {
            return res.status(503).json({ error: `All AI models unavailable. Last error: ${lastError.substring(0, 200)}`, type: 'error' });
        }

        const data = await geminiResponse.json();
        const candidate = data.candidates?.[0];
        if (!candidate || !candidate.content || !candidate.content.parts) {
            console.error("Unexpected Gemini response structure:", JSON.stringify(data));
            return res.status(500).json({ error: 'Unexpected response format from AI', type: 'error' });
        }

        // When using tools, the text might be nested or the first part might be a function call.
        // We find the part that actually contains the text response.
        const textPart = candidate.content.parts.find((p: any) => p.text);
        if (!textPart) {
            console.error("No text part found in Gemini response:", JSON.stringify(data));
            return res.status(500).json({ error: 'No text returned from AI', type: 'error' });
        }

        let resultText = textPart.text;

        let result;
        try {
            // Robustly extract JSON block even if model includes conversational text or markdown
            const firstBrace = resultText.indexOf('{');
            const lastBrace = resultText.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
                const jsonString = resultText.substring(firstBrace, lastBrace + 1);
                result = JSON.parse(jsonString);
            } else {
                throw new Error("No JSON object braces found in response");
            }
        } catch (parseError) {
            console.warn("Gemini output was not valid JSON. Forwarding raw text as clarification.", resultText);
            // If Gemini refuses to output JSON and gives a conversational text (like "I can't recognize this image"),
            // we safely package it as a clarification so the frontend displays it in the red interrogation panel instead of exploding.
            result = {
                type: 'clarification',
                question: resultText.substring(0, 150) + (resultText.length > 150 ? '...' : ''),
                options: ['Retry Upload', 'Manual Log']
            };
        }

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('API Route Error:', error.message || error);
        return res.status(500).json({ error: 'Internal Server Error', type: 'error', details: error.message });
    }
}
