
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { EXERCISE_BONUS_KCAL, EXERCISE_BONUS_PROTEIN } from '../utils/calorieFormula';
import { clearAllPending } from '../utils/pendingQueue';
import { Language, getInitialLanguage } from '../utils/i18n';

export { EXERCISE_BONUS_KCAL, EXERCISE_BONUS_PROTEIN };

export interface FoodEntry {
    id: string;
    name: string;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    timestamp: number;
    requiresReview?: boolean;
}

export interface HistoricalDay {
    targetKcal?: number;
    targetProtein?: number;
    exerciseDay?: boolean;
    dateStr: string;
    realDateStr: string;
    kcal: number;
    protein: number;
    entries: FoodEntry[];
}

interface UserProfile {
    height: number;
    weight: number;
    age: number;
    gender: string;
    goal: string;
    activityLevel: string;
}

const createId = () => globalThis.crypto?.randomUUID?.() || Math.random().toString(36).substring(2);

const startOfLocalDay = (timestamp: number) => {
    const date = new Date(timestamp);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
};

const isToday = (timestamp: number) => startOfLocalDay(timestamp) === startOfLocalDay(Date.now());

const historyLabel = (timestamp: number) => {
    const todayStart = startOfLocalDay(Date.now());
    const timestampStart = startOfLocalDay(timestamp);
    const yesterday = new Date(todayStart);
    yesterday.setDate(yesterday.getDate() - 1);
    if (timestampStart === yesterday.getTime()) return 'Yesterday';
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export interface ProcessingLog {
    id: string;
    text: string;
    type: 'text' | 'image' | 'voice';
}

interface AppState {
    historicalExerciseDays: string[];
    smartwatchWeeklyBurn: number | null;
    setSmartwatchWeeklyBurn: (burn: number | null) => void;
    smartwatchMonthlyBurn: number | null;
    setSmartwatchMonthlyBurn: (burn: number | null) => void;
    session: Session | null;
    persistedScope: string | null;
    setSession: (session: Session | null) => void;
    isGuest: boolean;
    setGuestMode: (isGuest: boolean) => void;
    fetchCloudData: () => Promise<void>;
    isCalibrated: boolean;
    profile: UserProfile | null;
    targetKcal: number;
    targetProtein: number;
    consumedKcal: number;
    consumedProtein: number;
    yesterdayKcal: number;
    yesterdayProtein: number;
    historicalDays: HistoricalDay[];
    dailyLog: FoodEntry[];
    calibrateUser: (profile: UserProfile, kcal: number, protein: number) => Promise<void>;
    addEntry: (entry: Omit<FoodEntry, 'id' | 'timestamp'>) => Promise<void>;
    addEntryWithTimestamp: (entry: Omit<FoodEntry, 'id' | 'timestamp'>, timestamp: number) => Promise<void>;
    updateEntry: (id: string, updatedData: Partial<Omit<FoodEntry, 'id'>>) => Promise<void>;
    deleteEntry: (id: string) => Promise<void>;
    resetDaily: () => Promise<void>;
    resetAll: () => void;
    favorites: Omit<FoodEntry, 'id' | 'timestamp'>[];
    addFavorite: (entry: Omit<FoodEntry, 'id' | 'timestamp'>) => Promise<void>;
    removeFavorite: (name: string) => Promise<void>;
    updateFavorite: (oldName: string, updatedFav: Omit<FoodEntry, 'id' | 'timestamp'>) => Promise<void>;
    processingLogs: ProcessingLog[];
    addProcessingLog: (log: ProcessingLog) => void;
    removeProcessingLog: (id: string) => void;
    clearProcessingLogs: () => void;
    exerciseDay: boolean;
    toggleExerciseDay: () => void;
    celebrationDismissedDate: string | null;
    dismissCelebration: () => void;
    lastActiveDate: string | null;
    checkDayRollover: () => void;
    viewedHistoryDate: string | null;
    setViewedHistoryDate: (date: string | null) => void;
    language: Language;
    setLanguage: (language: Language) => void;
    lastCoachAuditDate: string | null;
    setLastCoachAuditDate: (date: string | null) => void;
}

export const useStore = create<AppState>()(
    persist(
    (set, get) => ({
            language: getInitialLanguage(),
            setLanguage: (language) => set({ language }),
            lastCoachAuditDate: null,
            setLastCoachAuditDate: (date) => set({ lastCoachAuditDate: date }),
            session: null,
            persistedScope: null,
            viewedHistoryDate: null,
            setViewedHistoryDate: (date) => set({ viewedHistoryDate: date }),
            smartwatchWeeklyBurn: null,
            setSmartwatchWeeklyBurn: (burn) => set({ smartwatchWeeklyBurn: burn }),
            smartwatchMonthlyBurn: null,
            setSmartwatchMonthlyBurn: (burn) => set({ smartwatchMonthlyBurn: burn }),
            setSession: (session) => {
                const previousUserId = get().session?.user.id;
                const nextUserId = session?.user.id;
                const previousPersistedScope = get().persistedScope;

                // An actual user switch happens ONLY when we had an active user ID previously AND now have a DIFFERENT user ID.
                const isRealUserSwitch = Boolean(previousUserId && nextUserId && previousUserId !== nextUserId);

                if (isRealUserSwitch) {
                    void clearAllPending();
                    set({
                        session,
                        isGuest: false,
                        persistedScope: nextUserId,
                        isCalibrated: false,
                        profile: null,
                        targetKcal: 0,
                        targetProtein: 0,
                        consumedKcal: 0,
                        consumedProtein: 0,
                        yesterdayKcal: 0,
                        yesterdayProtein: 0,
                        historicalDays: [],
                        dailyLog: [],
                        favorites: [],
                        historicalExerciseDays: [],
            smartwatchWeeklyBurn: null,
            setSmartwatchWeeklyBurn: (burn) => set({ smartwatchWeeklyBurn: burn }),
                        exerciseDay: false,
                        viewedHistoryDate: null,
                    });
                } else {
                    set({
                        session,
                        persistedScope: nextUserId ?? previousPersistedScope,
                        ...(session?.user ? { isGuest: false } : {})
                    });
                }
                if (session) {
                    void get().fetchCloudData();
                }
            },
            isGuest: false,
            setGuestMode: (isGuest) => set((state) => ({
                isGuest,
                // Keep the guest scope while the user is on the auth screen
                // so a sign-in attempt cannot erase local favorites first.
                persistedScope: isGuest ? 'guest' : (state.session?.user.id ?? state.persistedScope),
            })),

            fetchCloudData: async () => {
                const { session } = get();
                if (!session?.user) return;
                const userId = session.user.id;

                // Keep persisted local state visible during cloud hydration to prevent UI reset/flicker.

                // Fetch profile
                const { data: profileData } = await supabase.from('profiles').select('*').eq('id', userId).single();

                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);

                // Fetch today's entries
                const { data: entries } = await supabase.from('food_entries')
                    .select('*')
                    .eq('user_id', userId)
                    .gte('timestamp', startOfDay.getTime())
                    .order('timestamp', { ascending: false });

                // Fetch favorites
                const { data: favoritesData, error: favoritesError } = await supabase.from('favorites')
                    .select('*')
                    .eq('user_id', userId);

                if (favoritesError) {
                    // A temporary read/RLS failure must not erase favorites
                    // that are already cached locally.
                    console.error('Supabase Favorites Read Error:', favoritesError.message);
                }

                // Fetch all historical entries before today
                const { data: historicalEntries } = await supabase.from('food_entries')
                    .select('*')
                    .eq('user_id', userId)
                    .lt('timestamp', startOfDay.getTime())
                    .order('timestamp', { ascending: false });

                if (get().session?.user.id !== userId) return;

                if (profileData) {
                    set({
                        isCalibrated: true,
                        profile: {
                            height: profileData.height,
                            weight: profileData.weight,
                            age: profileData.age,
                            gender: profileData.gender,
                            goal: profileData.goal,
                            activityLevel: profileData.activity_level || 'LIGHT',
                        },
                        targetKcal: profileData.target_kcal,
                        targetProtein: profileData.target_protein
                    });
                }

                if (historicalEntries) {
                    const daysMap = new Map<string, HistoricalDay>();
                    let yKcal = 0;
                    let yProtein = 0;

                    const startOfYesterday = new Date(startOfDay);
                    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

                    historicalEntries.forEach(e => {
                        const date = new Date(Number(e.timestamp));
                        // Determine the date string
                        let dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        if (date.getTime() >= startOfYesterday.getTime()) {
                            dateStr = 'Yesterday';
                            yKcal += Math.round(Number(e.kcal));
                            yProtein += Math.round(Number(e.protein));
                        }

                        if (!daysMap.has(dateStr)) {
                            daysMap.set(dateStr, { dateStr, realDateStr: date.toDateString(), kcal: 0, protein: 0, entries: [] });
                        }

                        const day = daysMap.get(dateStr)!;
                        day.kcal += Math.round(Number(e.kcal));
                        day.protein += Math.round(Number(e.protein));
                        day.entries.push({
                            id: e.id,
                            name: e.name,
                            kcal: Math.round(Number(e.kcal)),
                            protein: Math.round(Number(e.protein)),
                            carbs: Math.round(Number(e.carbs)),
                            fat: Math.round(Number(e.fat)),
                            timestamp: Number(e.timestamp),
                            requiresReview: e.requires_review
                        });
                    });

                    set({
                        yesterdayKcal: yKcal,
                        yesterdayProtein: yProtein,
                        historicalDays: Array.from(daysMap.values())
                    });
                }

                if (entries) {
                    let totalKcal = 0;
                    let totalProtein = 0;
                    const parsedEntries = entries.map(e => {
                        totalKcal += Math.round(Number(e.kcal));
                        totalProtein += Math.round(Number(e.protein));
                        return {
                            id: e.id,
                            name: e.name,
                            kcal: Math.round(Number(e.kcal)),
                            protein: Math.round(Number(e.protein)),
                            carbs: Math.round(Number(e.carbs)),
                            fat: Math.round(Number(e.fat)),
                            timestamp: Number(e.timestamp),
                            requiresReview: e.requires_review
                        };
                    });
                    set({
                        consumedKcal: totalKcal,
                        consumedProtein: totalProtein,
                        dailyLog: parsedEntries
                    });
                }

                if (!favoritesError) {
                    const parsedFavorites = (favoritesData || []).map(f => ({
                        name: f.name,
                        kcal: Math.round(Number(f.kcal)),
                        protein: Math.round(Number(f.protein)),
                        carbs: Math.round(Number(f.carbs)),
                        fat: Math.round(Number(f.fat))
                    }));

                    if (parsedFavorites.length > 0) {
                        set({ favorites: parsedFavorites });
                    } else {
                        // If cloud returns empty favorites but user has local favorites, push local favorites to cloud
                        const localFavs = get().favorites;
                        if (localFavs && localFavs.length > 0) {
                            for (const fav of localFavs) {
                                void supabase.from('favorites').upsert({
                                    user_id: userId,
                                    name: fav.name,
                                    kcal: fav.kcal,
                                    protein: fav.protein,
                                    carbs: fav.carbs,
                                    fat: fav.fat,
                                    updated_at: new Date().toISOString()
                                }, { onConflict: 'user_id,name' });
                            }
                        }
                    }
                }
            },

            isCalibrated: false,
            profile: null,
            targetKcal: 0,
            targetProtein: 0,
            consumedKcal: 0,
            consumedProtein: 0,
            yesterdayKcal: 0,
            yesterdayProtein: 0,
            historicalDays: [],
            dailyLog: [],
            favorites: [],
            processingLogs: [],
            exerciseDay: false,
            historicalExerciseDays: [],

            toggleExerciseDay: () => set((state) => {
                const todayStr = new Date().toDateString();
                const newExerciseDay = !state.exerciseDay;
                
                let updatedHistory = [...(state.historicalExerciseDays || [])];
                if (newExerciseDay) {
                    if (!updatedHistory.includes(todayStr)) updatedHistory.push(todayStr);
                } else {
                    updatedHistory = updatedHistory.filter(d => d !== todayStr);
                }
                
                return { exerciseDay: newExerciseDay, historicalExerciseDays: updatedHistory };
            }),

            celebrationDismissedDate: null,
            dismissCelebration: () => set({ celebrationDismissedDate: new Date().toDateString() }),

            lastActiveDate: null,
            checkDayRollover: () => {
                const todayStr = new Date().toDateString();
                const { lastActiveDate, consumedKcal, consumedProtein, targetKcal, targetProtein, dailyLog, historicalDays } = get();

                if (lastActiveDate && lastActiveDate !== todayStr) {
                    // Day changed � move consumed totals and daily entries to historicalDays with active targets
                    console.log(`[DayRollover] ${lastActiveDate} -> ${todayStr}. Yesterday: ${consumedKcal} kcal, ${consumedProtein}g protein`);
                    const rolledOverDay: HistoricalDay = {
                        dateStr: lastActiveDate,
                        realDateStr: lastActiveDate,
                        kcal: consumedKcal,
                        protein: consumedProtein,
                        targetKcal,
                        targetProtein,
                        entries: [...dailyLog]
                    };
                    const existingFiltered = (historicalDays || []).filter(h => h.dateStr !== lastActiveDate);
                    set({
                        yesterdayKcal: consumedKcal,
                        yesterdayProtein: consumedProtein,
                        consumedKcal: 0,
                        consumedProtein: 0,
                        dailyLog: [],
                        exerciseDay: false,
                        lastActiveDate: todayStr,
                        historicalDays: [rolledOverDay, ...existingFiltered]
                    });
                } else if (!lastActiveDate) {
                    // First time � just record today
                    set({ lastActiveDate: todayStr });
                }
            },

            addProcessingLog: (log) => set((state) => ({ processingLogs: [log, ...state.processingLogs] })),
            removeProcessingLog: (id) => set((state) => ({ processingLogs: state.processingLogs.filter(l => l.id !== id) })),
            clearProcessingLogs: () => set({ processingLogs: [] }),

            calibrateUser: async (profile: UserProfile, kcal: number, protein: number) => {
                set(() => ({
                    isCalibrated: true,
                    profile,
                    targetKcal: kcal,
                    targetProtein: protein,
                }));

                const { session } = get();
                if (session?.user) {
                    const { error } = await supabase.from('profiles').upsert({
                        id: session.user.id,
                        height: profile.height,
                        weight: profile.weight,
                        age: profile.age,
                        gender: profile.gender,
                        goal: profile.goal,
                        activity_level: profile.activityLevel,
                        target_kcal: kcal,
                        target_protein: protein,
                        updated_at: new Date().toISOString()
                    });
                    if (error) console.error('Supabase Sync Error:', error.message);
                }
            },

            addEntry: async (entry: Omit<FoodEntry, 'id' | 'timestamp'>) => {
                const newId = createId();
                const timestamp = Date.now();
                const newEntry = { ...entry, id: newId, timestamp };

                // Optimistic Local UI Update
                set((state) => ({
                    consumedKcal: Math.round(state.consumedKcal + entry.kcal),
                    consumedProtein: Math.round(state.consumedProtein + entry.protein),
                    dailyLog: [newEntry, ...state.dailyLog]
                }));

                // Push to cloud in background
                const { session } = get();
                if (session?.user) {
                    const { error } = await supabase.from('food_entries').insert({
                        id: newId,
                        user_id: session.user.id,
                        name: entry.name,
                        kcal: entry.kcal,
                        protein: entry.protein,
                        carbs: entry.carbs,
                        fat: entry.fat,
                        timestamp: timestamp,
                        requires_review: entry.requiresReview || false
                    });
                    if (error) {
                        console.error('Supabase Sync Error:', error.message);
                        set((state) => ({
                            consumedKcal: Math.max(0, Math.round(state.consumedKcal - entry.kcal)),
                            consumedProtein: Math.max(0, Math.round(state.consumedProtein - entry.protein)),
                            dailyLog: state.dailyLog.filter(item => item.id !== newId),
                        }));
                    }
                }
            },

            addEntryWithTimestamp: async (entry, timestamp) => {
                const newId = createId();
                const newEntry = { ...entry, id: newId, timestamp };

                // Keep Day Recap entries in the day represented by their photo
                // timestamp. Older photos must not inflate today's totals.
                set((state) => {
                    if (!isToday(timestamp)) {
                        const dateStr = historyLabel(timestamp);
                        const existingDay = state.historicalDays.find(day => day.dateStr === dateStr);
                        const nextDay: HistoricalDay = existingDay
                            ? {
                                ...existingDay,
                                kcal: existingDay.kcal + Math.round(entry.kcal),
                                protein: existingDay.protein + Math.round(entry.protein),
                                entries: [...existingDay.entries, newEntry].sort((a, b) => b.timestamp - a.timestamp),
                            }
                            : {
                                dateStr,
                                realDateStr: new Date(timestamp).toDateString(),
                                kcal: Math.round(entry.kcal),
                                protein: Math.round(entry.protein),
                                entries: [newEntry],
                            };

                        return {
                            historicalDays: [
                                ...state.historicalDays.filter(day => day.dateStr !== dateStr),
                                nextDay,
                            ].sort((a, b) => {
                                const aTime = a.entries[0]?.timestamp || 0;
                                const bTime = b.entries[0]?.timestamp || 0;
                                return bTime - aTime;
                            }),
                        };
                    }

                    const updatedLog = [...state.dailyLog, newEntry].sort((a, b) => b.timestamp - a.timestamp);
                    return {
                        consumedKcal: Math.round(state.consumedKcal + entry.kcal),
                        consumedProtein: Math.round(state.consumedProtein + entry.protein),
                        dailyLog: updatedLog
                    };
                });

                // Push to cloud in background
                const { session } = get();
                if (session?.user) {
                    const { error } = await supabase.from("food_entries").insert({
                        id: newId,
                        user_id: session.user.id,
                        name: entry.name,
                        kcal: entry.kcal,
                        protein: entry.protein,
                        carbs: entry.carbs,
                        fat: entry.fat,
                        timestamp: timestamp,
                        requires_review: entry.requiresReview || false
                    });
                    if (error) {
                        console.error("Supabase Sync Error:", error.message);
                        set((state) => {
                            const dailyEntry = state.dailyLog.find(item => item.id === newId);
                            if (dailyEntry) {
                                return {
                                    consumedKcal: Math.max(0, Math.round(state.consumedKcal - entry.kcal)),
                                    consumedProtein: Math.max(0, Math.round(state.consumedProtein - entry.protein)),
                                    dailyLog: state.dailyLog.filter(item => item.id !== newId),
                                };
                            }

                            return {
                                historicalDays: state.historicalDays
                                    .map(day => {
                                        if (!day.entries.some(item => item.id === newId)) return day;
                                        return {
                                            ...day,
                                            kcal: Math.max(0, day.kcal - Math.round(entry.kcal)),
                                            protein: Math.max(0, day.protein - Math.round(entry.protein)),
                                            entries: day.entries.filter(item => item.id !== newId),
                                        };
                                    })
                                    .filter(day => day.entries.length > 0),
                            };
                        });
                    }
                }
            },

            updateEntry: async (id, updatedData) => {
                let targetDayKey: string | null = null;
                let oldEntry: FoodEntry | null = null;
                const previousDailyLog = get().dailyLog;
                const previousHistoricalDays = get().historicalDays;
                const previousConsumedKcal = get().consumedKcal;
                const previousConsumedProtein = get().consumedProtein;

                set((state) => {
                    // First check today
                    oldEntry = state.dailyLog.find(e => e.id === id) || null;
                    if (oldEntry) {
                        targetDayKey = 'today';
                        const kcalDiff = (updatedData.kcal ?? oldEntry.kcal) - oldEntry.kcal;
                        const proteinDiff = (updatedData.protein ?? oldEntry.protein) - oldEntry.protein;

                        return {
                            consumedKcal: Math.max(0, Math.round(state.consumedKcal + kcalDiff)),
                            consumedProtein: Math.max(0, Math.round(state.consumedProtein + proteinDiff)),
                            dailyLog: state.dailyLog.map(entry =>
                                entry.id === id ? { ...entry, ...updatedData } : entry
                            )
                        };
                    }

                    // If not today, check historicalDays
                    for (const historyDay of state.historicalDays || []) {
                        const histEntry = historyDay.entries?.find(e => e.id === id);
                        if (histEntry) {
                            oldEntry = histEntry;
                            targetDayKey = historyDay.dateStr;
                            break;
                        }
                    }

                    if (targetDayKey && targetDayKey !== 'today' && oldEntry) {
                        const kcalDiff = (updatedData.kcal ?? (oldEntry as FoodEntry).kcal) - (oldEntry as FoodEntry).kcal;
                        const proteinDiff = (updatedData.protein ?? (oldEntry as FoodEntry).protein) - (oldEntry as FoodEntry).protein;
                        
                        return {
                            historicalDays: state.historicalDays?.map(day => {
                                if (day.dateStr === targetDayKey) {
                                    return {
                                        ...day,
                                        kcal: Math.max(0, Math.round(day.kcal + kcalDiff)),
                                        protein: Math.max(0, Math.round(day.protein + proteinDiff)),
                                        entries: day.entries?.map(e => e.id === id ? { ...e, ...updatedData } : e)
                                    };
                                }
                                return day;
                            })
                        };
                    }

                    return state;
                });

                const { session } = get();
                if (session?.user && oldEntry) {
                    const finalEntry = { ...(oldEntry as FoodEntry), ...updatedData };
                    const { error } = await supabase.from('food_entries').update({
                        name: finalEntry.name,
                        kcal: finalEntry.kcal,
                        protein: finalEntry.protein,
                        carbs: finalEntry.carbs,
                        fat: finalEntry.fat,
                        timestamp: finalEntry.timestamp,
                        requires_review: finalEntry.requiresReview || false
                    }).eq('id', id);
                    if (error) {
                        console.error('Supabase Sync Error:', error.message);
                        set({
                            dailyLog: previousDailyLog,
                            historicalDays: previousHistoricalDays,
                            consumedKcal: previousConsumedKcal,
                            consumedProtein: previousConsumedProtein,
                        });
                    }
                }
            },

            deleteEntry: async (id) => {
                let entryToDelete: FoodEntry | null = null;
                let targetDayKey: string | null = null;
                const previousDailyLog = get().dailyLog;
                const previousHistoricalDays = get().historicalDays;
                const previousConsumedKcal = get().consumedKcal;
                const previousConsumedProtein = get().consumedProtein;
                
                set((state) => {
                    entryToDelete = state.dailyLog.find(e => e.id === id) || null;
                    if (entryToDelete) {
                        targetDayKey = 'today';
                        return {
                            consumedKcal: Math.max(0, Math.round(state.consumedKcal - entryToDelete.kcal)),
                            consumedProtein: Math.max(0, Math.round(state.consumedProtein - entryToDelete.protein)),
                            dailyLog: state.dailyLog.filter(e => e.id !== id)
                        };
                    }

                    for (const historyDay of state.historicalDays || []) {
                        const histEntry = historyDay.entries?.find(e => e.id === id);
                        if (histEntry) {
                            entryToDelete = histEntry;
                            targetDayKey = historyDay.dateStr;
                            break;
                        }
                    }

                    if (targetDayKey && targetDayKey !== 'today' && entryToDelete) {
                        return {
                            historicalDays: state.historicalDays?.map(day => {
                                if (day.dateStr === targetDayKey) {
                                    return {
                                        ...day,
                                        kcal: Math.max(0, Math.round(day.kcal - entryToDelete!.kcal)),
                                        protein: Math.max(0, Math.round(day.protein - entryToDelete!.protein)),
                                        entries: day.entries?.filter(e => e.id !== id)
                                    };
                                }
                                return day;
                            })
                        };
                    }
                    
                    return state;
                });

                // Delete from cloud
                const { session } = get();
                if (session?.user && entryToDelete) {
                    const { error } = await supabase.from('food_entries').delete().eq('id', id);
                    if (error) {
                        console.error('Supabase Delete Error:', error.message);
                        set({
                            dailyLog: previousDailyLog,
                            historicalDays: previousHistoricalDays,
                            consumedKcal: previousConsumedKcal,
                            consumedProtein: previousConsumedProtein,
                        });
                    }
                }
            },

            resetDaily: async () => {
                const previous = get();
                set({
                    yesterdayKcal: 0,
                    yesterdayProtein: 0,
                    consumedKcal: 0,
                    consumedProtein: 0,
                    dailyLog: [],
                    exerciseDay: false,
                });

                const { session } = get();
                if (session?.user) {
                    const startOfDay = new Date();
                    startOfDay.setHours(0, 0, 0, 0);
                    const { error } = await supabase.from('food_entries')
                        .delete()
                        .eq('user_id', session.user.id)
                        .gte('timestamp', startOfDay.getTime());
                    if (error) {
                        console.error('Supabase Reset Error:', error.message);
                        set({
                            yesterdayKcal: previous.yesterdayKcal,
                            yesterdayProtein: previous.yesterdayProtein,
                            consumedKcal: previous.consumedKcal,
                            consumedProtein: previous.consumedProtein,
                            dailyLog: previous.dailyLog,
                            exerciseDay: previous.exerciseDay,
                        });
                    }
                }
            },

            resetAll: () => {
                void clearAllPending();
                set(() => ({
                    isCalibrated: false,
                    isGuest: false,
                    persistedScope: null,
                    profile: null,
                    targetKcal: 0,
                    targetProtein: 0,
                    consumedKcal: 0,
                    consumedProtein: 0,
                    yesterdayKcal: 0,
                    yesterdayProtein: 0,
                    dailyLog: [],
                    historicalDays: [],
                    favorites: [],
                    historicalExerciseDays: [],
                    exerciseDay: false,
                    lastActiveDate: null,
                    celebrationDismissedDate: null,
                    viewedHistoryDate: null,
                    processingLogs: [],
                }));
            },

            addFavorite: async (entry) => {
                const previousFavorites = get().favorites;
                set((state) => ({
                    favorites: [...(state.favorites || []).filter(f => f.name !== entry.name), entry]
                }));

                const { session } = get();
                if (session?.user) {
                    const { error } = await supabase.from('favorites').upsert({
                        user_id: session.user.id,
                        name: entry.name,
                        kcal: entry.kcal,
                        protein: entry.protein,
                        carbs: entry.carbs,
                        fat: entry.fat,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id,name' });
                    if (error) {
                        console.error('Supabase Sync Error:', error.message);
                        set({ favorites: previousFavorites });
                    }
                }
            },

            removeFavorite: async (name) => {
                const previousFavorites = get().favorites;
                set((state) => ({
                    favorites: (state.favorites || []).filter(f => f.name !== name)
                }));

                const { session } = get();
                if (session?.user) {
                    const { error } = await supabase.from('favorites').delete().eq('user_id', session.user.id).eq('name', name);
                    if (error) {
                        console.error('Supabase Sync Error:', error.message);
                        set({ favorites: previousFavorites });
                    }
                }
            },

            updateFavorite: async (oldName, updatedFav) => {
                const previousFavorites = get().favorites;
                set((state) => {
                    const updatedList = (state.favorites || []).map(f =>
                        f.name === oldName ? updatedFav : f
                    );
                    return { favorites: updatedList };
                });

                const { session } = get();
                if (session?.user) {
                    // We delete the old and insert/upsert new if the name changed, 
                    // or just upsert if the name is the same.
                    if (oldName !== updatedFav.name) {
                        const { error } = await supabase.from('favorites').delete().eq('user_id', session.user.id).eq('name', oldName);
                        if (error) {
                            console.error('Supabase Sync Error:', error.message);
                            set({ favorites: previousFavorites });
                            return;
                        }
                    }
                    
                    const { error } = await supabase.from('favorites').upsert({
                        user_id: session.user.id,
                        name: updatedFav.name,
                        kcal: updatedFav.kcal,
                        protein: updatedFav.protein,
                        carbs: updatedFav.carbs,
                        fat: updatedFav.fat,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'user_id,name' });
                    if (error) {
                        console.error('Supabase Sync Error:', error.message);
                        set({ favorites: previousFavorites });
                    }
                }
            }
        }),
        {
            name: 'macro-tracker-storage',
            version: 5, // Added account-scoped favorite persistence
            // Keep favorites locally as a recovery cache for both guests and
            // signed-in users. The persisted scope prevents cross-account use;
            // Supabase remains the source of truth when its read succeeds.
            partialize: (state) => ({
                isGuest: state.isGuest,
                persistedScope: state.session?.user.id ?? state.persistedScope ?? (state.isGuest ? 'guest' : null),
                favorites: state.favorites,
                isCalibrated: state.isCalibrated,
                profile: state.profile,
                targetKcal: state.targetKcal,
                targetProtein: state.targetProtein,
                consumedKcal: state.consumedKcal,
                consumedProtein: state.consumedProtein,
                yesterdayKcal: state.yesterdayKcal,
                yesterdayProtein: state.yesterdayProtein,
                historicalDays: state.historicalDays,
                dailyLog: state.dailyLog,
                exerciseDay: state.exerciseDay,
                historicalExerciseDays: state.historicalExerciseDays,
                celebrationDismissedDate: state.celebrationDismissedDate,
                lastActiveDate: state.lastActiveDate,
                smartwatchWeeklyBurn: state.smartwatchWeeklyBurn,
                smartwatchMonthlyBurn: state.smartwatchMonthlyBurn,
            }),
            migrate: (persistedState: any, version: number) => {
                if (version === 0 && persistedState) {
                    persistedState.favorites = [];
                }
                if (version < 2 && persistedState) {
                    persistedState.celebrationDismissedDate = null;
                }
                if (version < 3 && persistedState) {
                    persistedState.lastActiveDate = null;
                }
                if (version < 4 && persistedState) {
                    persistedState.historicalExerciseDays = [];
                }
                if (version < 5 && persistedState) {
                    persistedState.persistedScope = persistedState.isGuest ? 'guest' : null;
                }
                return (persistedState as AppState) || {} as AppState;
            }
        }
    )
);
