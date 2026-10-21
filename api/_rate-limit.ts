/** Shared serverless rate limiter backed by Upstash Redis REST. */
export async function consumeRateLimit(key: string, limit: number): Promise<boolean> {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw new Error('Shared rate limiter is not configured');
    const redisKey = 'macro:limit:' + key + ':' + Math.floor(Date.now() / 60000);
    const response = await fetch(url.replace(/\/$/, '') + '/pipeline', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify([['INCR', redisKey], ['EXPIRE', redisKey, 120]])
    });
    if (!response.ok) throw new Error('Rate limiter unavailable');
    const result = await response.json() as Array<{ result?: number; error?: string }>;
    if (!Array.isArray(result) || result[0]?.error || result[1]?.error ||
        typeof result[0]?.result !== 'number') throw new Error('Invalid rate limiter response');
    return result[0].result <= limit;
}
