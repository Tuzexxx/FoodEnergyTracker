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

export async function guardRequest(req: ApiRequest, res: ApiResponse): Promise<string | null> {
    const auth = await authenticate(req);
    if (auth.invalidToken) {
        res.status(401).json({ error: 'Authentication required or expired.' });
        return null;
    }

    const key = auth.userId ? ('user:' + auth.userId) : ('guest:' + clientKey(req));
    const limit = auth.userId ? 40 : 10;
    if (!consumeRateLimit(key, limit)) {
        res.status(429).json({ error: 'Too many analysis requests. Please try again later.' });
        return null;
    }

    return auth.userId ?? 'guest';
}

export default async function handler(req: ApiRequest & { method?: string }, res: ApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (await guardRequest(req, res) === null) return;

    const body = (req.body || {}) as Record<string, any>;
    const { dailyLog = [], consumedKcal = 0, consumedProtein = 0, consumedCarbs = 0, consumedFat = 0, targetKcal = 2000, targetProtein = 150, exerciseDay = false, profile = {}, historicalSummary = '' } = body;

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured', type: 'error' });
        }

        const dailyLogSummary = (dailyLog || []).map((item: any) => {
            const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
            return `- [${timeStr}] ${item.name}: ${item.kcal} kcal, ${item.protein}g protein, ${item.carbs || 0}g carbs, ${item.fat || 0}g fat`;
        }).join('\n') || '(Zatím žádná zaznamenaná jídla pro dnešek)';

        const prompt = `Jsi přísný, vysoce analytický a nekompromisní nutriční a silový kouč integrovaný v aplikaci MacroTrack.
Tvým úkolem je analyzovat denní jídelníček uživatele, časování živin, tréninkový objem a regeneraci. Nejsi tu od toho, abys uživatele bezdůvodně chválil nebo byl přehnaně příjemný – tvým cílem je odhalit skryté chyby, metabolické brzdy a zbytečné kalorické úniky.

VÝSTUP MUSÍ BÝT V ČEŠTINĚ, STROHÝ, BRUTÁLNÍ, DŮSLEDNÝ A PŘESNÝ.

UŽIVATELSKÝ KONTEXT TELEMETRIE:
- Denní kalorický cíl: ${targetKcal} kcal ${exerciseDay ? '(Aktivní tréninkový den: bonus +300 kcal a +10g bílkovin)' : '(Netréninkový / regenerační den)'}
- Cíl bílkovin: ${targetProtein} g
- Dnešní příjem celkem: ${consumedKcal} kcal | ${consumedProtein}g bílkovin | ${consumedCarbs}g sacharidů | ${consumedFat}g tuků
- Tréninkový stav dnes: ${exerciseDay ? 'SILOVÝ TRÉNINK / GYM AKTIVNÍ' : 'ODPOČINKOVÝ / REGENERAČNÍ DEN'}
- Profil uživatele: Cíl=${profile?.goal || 'Udržování/Rekompozice'}, Hmotnost=${profile?.weight || 'N/A'} kg, Úroveň aktivity=${profile?.activityLevel || 'Standardní'}
- Zaznamenaná jídla dnes (s časovými značkami):
${dailyLogSummary}
- Historický kontext:
${historicalSummary || 'Standardní historie'}

POKYNY PRO HODNOCENÍ:
1. Makro integrita: Splnil uživatel bílkoviny bez přetažení kalorií a tuků? Je poměr bílkovin dostatečný pro růst/udržení svalů?
2. Časování živin (Nutrient Timing): Jsou bílkoviny rozprostřeny rovnoměrně (každé 3-4h)? Jsou sacharidy vhodně načasovány kolem tréninku, nebo byly zbytečně zkonzumovány pozdě večer v netréninkový den?
3. Metabolické úniky a skryté brzdy: Identifikuj tekuté kalorie, nadbytek nasycených tuků, průmyslově zpracované potraviny nebo chybějící před/potréninkové jídlo. Pokud uživatel dnes ještě nic nezaznamenal, upozorni na to jako na kritické selhání evidence.
4. Direktiva na zítra: Přesně 3 nekompromisní, konkrétní a okamžitě aplikovatelné taktické pokyny na zítřejší den.

VÝSTUP POUZE STRIKTNÍ JSON BEZ TEXTU KOLEME:
{
  "type": "success",
  "grade": "A+" | "A" | "B" | "C" | "D" | "F",
  "score": <číslo 0-100>,
  "verdict": "<Stručný, úderný verdikt, např. 'Suboptimální rozložení bílkovin, přebytek skrytých tuků večer'>",
  "macroIntegrity": {
    "status": "PASS" | "WARNING" | "CRITICAL",
    "score": <číslo 0-100>,
    "comment": "<Přesný analytický rozbor kalorické a makro bilance>"
  },
  "nutrientTiming": {
    "status": "OPTIMAL" | "SUBOPTIMAL" | "CRITICAL",
    "comment": "<Hodnocení časování živin vzhledem k tréninku a rozestupům mezi jídly>"
  },
  "metabolicLeaks": [
    {
      "title": "<Název úniku / chyby>",
      "description": "<Proč tato položka zpomaluje progres nebo tvoří zbytečné kalorie>",
      "severity": "high" | "medium" | "low"
    }
  ],
  "directives": [
    "<1. Konkrétní nekompromisní úkol na zítra>",
    "<2. Konkrétní nekompromisní úkol na zítra>",
    "<3. Konkrétní nekompromisní úkol na zítra>"
  ]
}`;

        const MODELS = [
            'gemini-3.6-flash',
            'gemini-3.5-flash-lite',
        ];

        const requestBody = JSON.stringify({
            system_instruction: {
                parts: [{ text: "Vždy vracej striktní JSON objekt bez okolního textu." }]
            },
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: { responseMimeType: 'application/json' },
        });

        let geminiResponse: Response | null = null;
        let lastError = '';

        for (const model of MODELS) {
            console.log(`[coach-analysis] Trying model: ${model}`);
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
                console.warn(`[coach-analysis] Model ${model} failed (${resp.status}):`, lastError);
            } catch (err: any) {
                lastError = err.message || String(err);
                console.warn(`[coach-analysis] Model ${model} exception:`, lastError);
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
        const textPart = candidate?.content?.parts?.find((p: any) => p.text);
        if (!textPart || !textPart.text) {
            return res.status(500).json({ error: 'No response from AI coach', type: 'error' });
        }

        const resultText = textPart.text;
        const firstBrace = resultText.indexOf('{');
        const lastBrace = resultText.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
            return res.status(500).json({ error: 'Invalid JSON response from AI', type: 'error' });
        }

        const parsed = JSON.parse(resultText.substring(firstBrace, lastBrace + 1));
        return res.status(200).json(parsed);
    } catch (error: any) {
        console.error('API Route Error [coach-analysis]:', error.message || error);
        return res.status(500).json({ error: 'Internal Server Error', type: 'error' });
    }
}
