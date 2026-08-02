import { createClient } from '@supabase/supabase-js';

export interface ApiRequest {
    headers?: Record<string, string | string[] | undefined>;
    body?: unknown;
}

export interface ApiResponse {
    status: (code: number) => ApiResponse;
    json: (body: unknown) => unknown;
}

interface AuthResult {
    userId: string | null;
    invalidToken: boolean;
}

const MAX_INPUT_LENGTH = 2000;
const MAX_MESSAGE_LENGTH = 500;
const MAX_IMAGE_LENGTH = 15000000;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function header(req: ApiRequest, name: string): string {
    const value = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
    return Array.isArray(value) ? value[0] || '' : value || '';
}

function clientKey(req: ApiRequest): string {
    return header(req, 'x-forwarded-for').split(',')[0].trim() || 'unknown-client';
}

function consumeRateLimit(key: string, limit: number): boolean {
    const now = Date.now();
    const current = requestCounts.get(key);
    if (!current || current.resetAt <= now) {
        requestCounts.set(key, { count: 1, resetAt: now + 60000 });
        return true;
    }
    if (current.count >= limit) return false;
    current.count += 1;
    return true;
}

async function authenticate(req: ApiRequest): Promise<AuthResult> {
    try {
        const authorization = header(req, 'authorization');
        if (!authorization) return { userId: null, invalidToken: false };

        const token = authorization.replace(/^Bearer\s+/i, '').trim();
        if (!token) return { userId: null, invalidToken: false };

        const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) return { userId: null, invalidToken: false };

        const client = createClient(supabaseUrl, supabaseAnonKey);
        const { data, error } = await client.auth.getUser(token);
        if (error || !data?.user) {
            return { userId: null, invalidToken: true };
        }
        return { userId: data.user.id, invalidToken: false };
    } catch (err) {
        console.warn('[auth] Error checking token:', err);
        return { userId: null, invalidToken: false };
    }
}

/** Apply lightweight abuse protection while retaining the app's guest mode. */
export async function guardRequest(req: ApiRequest, res: ApiResponse): Promise<string | null> {
    const auth = await authenticate(req);
    if (auth.invalidToken) {
        res.status(401).json({ error: 'Authentication required or expired.' });
        return null;
    }

    const key = auth.userId ? ('user:' + auth.userId) : ('guest:' + clientKey(req));
    const limit = auth.userId ? 60 : 10;
    if (!consumeRateLimit(key, limit)) {
        res.status(429).json({ error: 'Too many requests. Please try again later.' });
        return null;
    }

    return auth.userId ?? 'guest';
}

export function validateAnalyzeBody(body: unknown): { input: string; image?: string } | { error: string } {
    if (!body || typeof body !== 'object') return { error: 'Invalid request body.' };
    const candidate = body as Record<string, unknown>;
    const input = typeof candidate.input === 'string' ? candidate.input.trim() : '';
    const image = typeof candidate.image === 'string' ? candidate.image : undefined;

    if (!input && !image) return { error: 'Input or image is required.' };
    if (input.length > MAX_INPUT_LENGTH) return { error: 'Input must be ' + MAX_INPUT_LENGTH + ' characters or fewer.' };
    if (image) {
        if (image.length > MAX_IMAGE_LENGTH) return { error: 'Image is too large.' };
        if (!/^data:image\/[a-zA-Z0-9.-]+;base64,/i.test(image)) {
            return { error: 'Only JPEG, PNG, and WebP data images are supported.' };
        }
    }

    return { input, image };
}

export function validateEditBody(body: unknown): { entry: Record<string, unknown>; message: string } | { error: string } {
    if (!body || typeof body !== 'object') return { error: 'Invalid request body.' };
    const candidate = body as Record<string, unknown>;
    const entry = candidate.entry;
    const message = typeof candidate.message === 'string' ? candidate.message.trim() : '';
    if (!entry || typeof entry !== 'object' || !message) return { error: 'Entry and message are required.' };
    if (message.length > MAX_MESSAGE_LENGTH) return { error: 'Message must be ' + MAX_MESSAGE_LENGTH + ' characters or fewer.' };

    const entryRecord = entry as Record<string, unknown>;
    for (const field of ['name', 'kcal', 'protein', 'carbs', 'fat']) {
        if (!(field in entryRecord)) return { error: "Entry field '" + field + "' is required." };
    }
    return { entry: entryRecord, message };
}

export function isValidMacroResult(result: unknown): boolean {
    if (!result || typeof result !== 'object') return false;
    const data = (result as Record<string, unknown>).data;
    if (!data || typeof data !== 'object') return false;
    const values = data as Record<string, unknown>;
    return typeof values.name === 'string'
        && ['kcal', 'protein', 'carbs', 'fat'].every(field => typeof values[field] === 'number' && Number.isFinite(values[field]) && values[field] >= 0 && values[field] <= 100000);
}

export default async function handler(req: ApiRequest & { method?: string }, res: ApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (await guardRequest(req, res) === null) return;
    const validated = validateAnalyzeBody(req.body);
    if ('error' in validated) return res.status(400).json({ error: validated.error });
    const { input, image } = validated;

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
            'gemini-3.6-flash',
            'gemini-3.5-flash-lite',
        ];

        const requestBodyObj: any = {
            system_instruction: {
                parts: [{ text: prompt }]
            },
            contents: [{ parts }],
            generationConfig: { responseMimeType: 'application/json' },
        };

        // Google Search Grounding tool is only supported for text inputs, NOT multimodal/image inputs

        const requestBody = JSON.stringify(requestBodyObj);

        let geminiResponse: Response | null = null;
        let lastError = '';

                for (const model of MODELS) {
            console.log(`[analyze] Trying model: ${model}`);
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
                console.warn(`[analyze] Model ${model} failed (${resp.status}):`, lastError);
            } catch (err: any) {
                lastError = err.message || String(err);
                console.warn(`[analyze] Model ${model} exception:`, lastError);
            }
        }

        if (!geminiResponse) {
            return res.status(503).json({ error: `All AI models unavailable. Last error: ${lastError.substring(0, 200)}`, type: 'error' });
        }

        interface GeminiCandidate {
    content?: {
        parts?: Array<{ text?: string }>;
    };
}

interface GeminiResponse {
    candidates?: GeminiCandidate[];
}

        const data = (await geminiResponse.json()) as GeminiResponse;
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

        const resultText = textPart.text;

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
        } catch {
            console.warn("Gemini output was not valid JSON. Forwarding raw text as clarification.", resultText);
            // If Gemini refuses to output JSON and gives a conversational text (like "I can't recognize this image"),
            // we safely package it as a clarification so the frontend displays it in the red interrogation panel instead of exploding.
            result = {
                type: 'clarification',
                question: resultText.substring(0, 150) + (resultText.length > 150 ? '...' : ''),
                options: ['Retry Upload', 'Manual Log']
            };
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
