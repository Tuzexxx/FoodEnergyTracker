import { get, set, del, keys, createStore } from 'idb-keyval';

/**
 * IndexedDB-backed pending queue for AI analysis requests.
 * Ensures requests survive screen-lock / tab suspension on mobile.
 *
 * Flow:
 *  1. savePending(id, payload) — called BEFORE fetch fires
 *  2. removePending(id)       — called AFTER successful processing
 *  3. getAllPending()          — called on app resume to retry stale items
 */

export interface PendingItem {
    id: string;
    input: string;
    image?: string;
    timestamp: number;
    status: 'PENDING';
}

// Dedicated IndexedDB store so we don't collide with Zustand's persist
const pendingStore = createStore('macro-tracker-pending', 'pending-requests');

/** Persist a request payload before sending */
export async function savePending(id: string, input: string, image?: string): Promise<void> {
    const item: PendingItem = {
        id,
        input,
        image,
        timestamp: Date.now(),
        status: 'PENDING',
    };
    await set(id, item, pendingStore);
}

/** Remove a completed/successful request */
export async function removePending(id: string): Promise<void> {
    await del(id, pendingStore);
}

/** Get all pending items for retry */
export async function getAllPending(): Promise<PendingItem[]> {
    const allKeys = await keys(pendingStore);
    const items: PendingItem[] = [];

    for (const key of allKeys) {
        const item = await get<PendingItem>(key, pendingStore);
        if (item) {
            // Garbage-collect items older than 24 hours
            if (Date.now() - item.timestamp > 24 * 60 * 60 * 1000) {
                await del(key, pendingStore);
                continue;
            }
            items.push(item);
        }
    }

    return items;
}

/** Clear all pending items (e.g., on logout) */
export async function clearAllPending(): Promise<void> {
    const allKeys = await keys(pendingStore);
    for (const key of allKeys) {
        await del(key, pendingStore);
    }
}
