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
    const {
        period = 'today',
        dailyLog = [],
        consumedKcal = 0,
        consumedProtein = 0,
        consumedCarbs = 0,
        consumedFat = 0,
        targetKcal = 2000,
        targetProtein = 150,
        exerciseDay = false,
        profile = {},
        historicalSummary = '',
        language = 'en'
    } = body;

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API key not configured', type: 'error' });
        }

        const dailyLogSummary = (dailyLog || []).map((item: any) => {
            const timeStr = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
            return `- [${timeStr}] ${item.name}: ${item.kcal} kcal, ${item.protein}g protein, ${item.carbs || 0}g carbs, ${item.fat || 0}g fat`;
        }).join('\n') || '(No meals logged in this scope)';

        const langName = language === 'cs' ? 'Czech' : language === 'de' ? 'German' : 'English';
        const isWeekly = period === '7d';
        const isYesterday = period === 'yesterday';

        const prompt = `You are a world-class, sharp, highly analytical nutrition and metabolic performance coach in the MacroTrack app.
Your task is to perform an objective, data-driven audit of the user's ${isWeekly ? '7-day nutrition trend, weekly consistency, and metabolic trajectory' : isYesterday ? "yesterday's completed nutrition log, recovery, and macro adherence" : "daily nutrition log, macronutrient balance, nutrient timing, and recovery"}.
Provide direct, constructive, high-impact feedback to optimize performance and body composition.

IMPORTANT: ALL TEXT STRINGS IN YOUR JSON RESPONSE (verdict, comments, title, description, directives) MUST BE IN ${langName.toUpperCase()}.

USER TELEMETRY CONTEXT:
- Audit Scope: ${isWeekly ? 'LAST 7 DAYS COMPREHENSIVE TREND AUDIT' : isYesterday ? 'YESTERDAY COMPLETED DAY AUDIT' : 'TODAY REAL-TIME AUDIT'}
- Daily Calorie Target: ${targetKcal} kcal ${exerciseDay ? '(Active Workout Mode: +300 kcal buffer applied)' : '(Standard Base Target)'}
- Daily Protein Target: ${targetProtein} g
- Consumed in this period: ${consumedKcal} kcal | ${consumedProtein}g Protein | ${consumedCarbs}g Carbs | ${consumedFat}g Fat
- Workout Mode: ${exerciseDay ? 'Active Workout / Training Day' : 'Standard / Rest & Recovery Day'}
- User Profile: Goal=${profile?.goal || 'Maintain / Recomp'}, Weight=${profile?.weight || 'N/A'} kg, Baseline Activity=${profile?.activityLevel || 'Standard'}
- Meals Logged (with timestamps):
${dailyLogSummary}
- Historical Context / Previous Days:
${historicalSummary || '(No previous completed days recorded)'}

AUDIT GUIDELINES:
1. Macro Integrity: ${isWeekly ? 'Evaluate 7-day adherence consistency, protein hit rate across the week, and caloric surplus/deficit stability.' : 'Did the user hit their protein target without excessive calorie/fat overages? Is protein distribution sufficient for muscle preservation?'}
2. Nutrient Timing & Recovery: ${isWeekly ? 'Analyze weekly training frequency and recovery nutrition consistency.' : 'Are protein feedings distributed appropriately? Are carbs strategically placed around active times?'}
3. Metabolic Leaks & Friction: ${isWeekly ? 'Identify chronic weekly caloric leaks, weekend drift, or skipped logging.' : 'Identify hidden liquid calories, excess saturated fat, ultra-processed items, or missing pre/post fuel.'}
4. Directives: Provide exactly 3 actionable, high-leverage tactical directives for ${isWeekly ? 'the coming week (strategic habits)' : isYesterday ? 'today (immediate course corrections and actionable steps based on yesterday)' : 'tomorrow (immediate actionable steps)'}.

OUTPUT ONLY STRICT JSON MATCHING THIS SCHEMA:
{
  "type": "success",
  "grade": "A+" | "A" | "B" | "C" | "D" | "F",
  "score": <number 0-100>,
  "verdict": "<Concise, impactful 1-2 sentence overall summary in ${langName}>",
  "macroIntegrity": {
    "status": "PASS" | "WARNING" | "CRITICAL",
    "score": <number 0-100>,
    "comment": "<Analytical breakdown of calorie and macro balance in ${langName}>"
  },
  "nutrientTiming": {
    "status": "OPTIMAL" | "SUBOPTIMAL" | "CRITICAL",
    "comment": "<Evaluation of feeding intervals, timing, and recovery in ${langName}>"
  },
  "metabolicLeaks": [
    {
      "title": "<Short leak title in ${langName}>",
      "description": "<Why this impedes progress and how to fix it in ${langName}>",
      "severity": "high" | "medium" | "low"
    }
  ],
  "directives": [
    "<Directive 1 in ${langName}>",
    "<Directive 2 in ${langName}>",
    "<Directive 3 in ${langName}>"
  ]
}`;

        const MODELS = [
            'gemini-3.6-flash',
            'gemini-3.5-flash-lite',
        ];

        const requestBody = JSON.stringify({
            system_instruction: {
                parts: [{ text: "Always return a valid, well-formed JSON object without markdown fences or additional conversational text." }]
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
