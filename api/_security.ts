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

const MAX_INPUT_LENGTH = 2_000;
const MAX_MESSAGE_LENGTH = 500;
const MAX_IMAGE_LENGTH = 5_000_000;
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
        requestCounts.set(key, { count: 1, resetAt: now + 60_000 });
        return true;
    }
    if (current.count >= limit) return false;
    current.count += 1;
    return true;
}

async function authenticate(req: ApiRequest): Promise<AuthResult> {
    const authorization = header(req, 'authorization');
    if (!authorization) return { userId: null, invalidToken: false };

    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!token || !supabaseUrl || !supabaseAnonKey) return { userId: null, invalidToken: true };

    const client = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await client.auth.getUser(token);
    return { userId: error || !data.user ? null : data.user.id, invalidToken: Boolean(error || !data.user) };
}

/** Apply lightweight abuse protection while retaining the app's guest mode. */
export async function guardRequest(req: ApiRequest, res: ApiResponse): Promise<string | null> {
    const auth = await authenticate(req);
    if (auth.invalidToken) {
        res.status(401).json({ error: 'Authentication required or expired.' });
        return null;
    }

    const key = auth.userId ? `user:${auth.userId}` : `guest:${clientKey(req)}`;
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
    if (input.length > MAX_INPUT_LENGTH) return { error: `Input must be ${MAX_INPUT_LENGTH} characters or fewer.` };
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
    if (message.length > MAX_MESSAGE_LENGTH) return { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` };

    const entryRecord = entry as Record<string, unknown>;
    for (const field of ['name', 'kcal', 'protein', 'carbs', 'fat']) {
        if (!(field in entryRecord)) return { error: `Entry field '${field}' is required.` };
    }
    return { entry: entryRecord, message };
}

export function isValidMacroResult(result: unknown): boolean {
    if (!result || typeof result !== 'object') return false;
    const data = (result as Record<string, unknown>).data;
    if (!data || typeof data !== 'object') return false;
    const values = data as Record<string, unknown>;
    return typeof values.name === 'string'
        && ['kcal', 'protein', 'carbs', 'fat'].every(field => typeof values[field] === 'number' && Number.isFinite(values[field]) && values[field] >= 0 && values[field] <= 100_000);
}
