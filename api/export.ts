import { createClient } from '@supabase/supabase-js';

export interface ApiRequest {
    headers?: Record<string, string | string[] | undefined>;
    query?: Record<string, string | string[] | undefined>;
    method?: string;
}

export interface ApiResponse {
    status: (code: number) => ApiResponse;
    json: (body: unknown) => unknown;
    setHeader: (name: string, value: string) => void;
}

function header(req: ApiRequest, name: string): string {
    const value = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
    return Array.isArray(value) ? value[0] || '' : value || '';
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, x-export-key');

    if (req.method === 'OPTIONS') {
        return res.status(200).json({ ok: true });
    }

    if (req.method && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const authHeader = header(req, 'authorization');
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    if (!token) {
        return res.status(401).json({
            error: 'Authentication required. Provide Bearer token in Authorization header.',
            help: 'You can copy your personal API token in Macro Tracker -> Settings -> Export.'
        });
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: userData, error: userError } = await client.auth.getUser(token);
    if (userError || !userData?.user) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userId = userData.user.id;

    // Fetch profile
    const { data: profile } = await client.from('profiles').select('*').eq('id', userId).single();

    // Fetch food entries
    const { data: entries, error: entriesError } = await client.from('food_entries')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

    if (entriesError) {
        return res.status(500).json({ error: entriesError.message });
    }

    // Group by local day (YYYY-MM-DD)
    const daysMap: Record<string, {
        dateStr: string;
        totalKcal: number;
        totalProtein: number;
        totalCarbs: number;
        totalFat: number;
        entries: any[];
    }> = {};

    (entries || []).forEach((e: any) => {
        const d = new Date(Number(e.timestamp));
        const dateStr = d.toISOString().split('T')[0];
        if (!daysMap[dateStr]) {
            daysMap[dateStr] = {
                dateStr,
                totalKcal: 0,
                totalProtein: 0,
                totalCarbs: 0,
                totalFat: 0,
                entries: []
            };
        }
        daysMap[dateStr].totalKcal += Number(e.kcal || 0);
        daysMap[dateStr].totalProtein += Number(e.protein || 0);
        daysMap[dateStr].totalCarbs += Number(e.carbs || 0);
        daysMap[dateStr].totalFat += Number(e.fat || 0);
        daysMap[dateStr].entries.push(e);
    });

    return res.status(200).json({
        user: {
            id: userId,
            email: userData.user.email
        },
        profile,
        exportTimestamp: Date.now(),
        dailyHistory: Object.values(daysMap).sort((a, b) => b.dateStr.localeCompare(a.dateStr)),
        rawEntriesCount: (entries || []).length
    });
}
