export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { input } = req.body;
    if (!input) {
        return res.status(400).json({ error: 'Input is required' });
    }

    try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: `You are a brutally efficient military/sci-fi AI telemetry module. Your job is to parse food entries.
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
}`
                    },
                    {
                        role: 'user',
                        content: input
                    }
                ],
                response_format: { type: "json_object" }
            })
        });

        const data = await groqResponse.json();
        const resultText = data.choices[0].message.content;
        const result = JSON.parse(resultText);

        return res.status(200).json(result);
    } catch (error) {
        console.error('Groq API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', type: 'error' });
    }
}
