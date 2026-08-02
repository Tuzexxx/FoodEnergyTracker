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
const MAX_IMAGE_LENGTH = 5000000;
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
        if (!/^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(image)) {
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
            'gemini-3.6-flash',
            'gemini-3.5-flash-lite',
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
