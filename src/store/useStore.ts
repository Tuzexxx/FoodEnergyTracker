import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { EXERCISE_BONUS_KCAL, EXERCISE_BONUS_PROTEIN } from '../utils/calorieFormula';

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
    dateStr: string;
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

export interface ProcessingLog {
    id: string;
    text: string;
    type: 'text' | 'image' | 'voice';
}

interface AppState {
    session: Session | null;
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
    calibrateUser: (profile: UserProfile, kcal: number, protein: number) => void;
    addEntry: (entry: Omit<FoodEntry, 'id' | 'timestamp'>) => void;
    updateEntry: (id: string, updatedData: Partial<Omit<FoodEntry, 'id'>>) => void;
    deleteEntry: (id: string) => void;
    resetDaily: () => void;
    resetAll: () => void;
    favorites: Omit<FoodEntry, 'id' | 'timestamp'>[];
    addFavorite: (entry: Omit<FoodEntry, 'id' | 'timestamp'>) => void;
    removeFavorite: (name: string) => void;
    updateFavorite: (oldName: string, updatedFav: Omit<FoodEntry, 'id' | 'timestamp'>) => void;
    processingLogs: ProcessingLog[];
    addProcessingLog: (log: ProcessingLog) => void;
    removeProcessingLog: (id: string) => void;
    clearProcessingLogs: () => void;
    exerciseDay: boolean;
    toggleExerciseDay: () => void;
    celebrationDismissedDate: string | null;
    dismissCelebration: () => void;
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            session: null,
            setSession: (session) => {
                set({ session, isGuest: false });
                if (session) {
                    get().fetchCloudData();
                }
            },
            isGuest: false,
            setGuestMode: (isGuest) => set({ isGuest }),

            fetchCloudData: async () => {
                const { session } = get();
                if (!session?.user) return;

                // Fetch profile
                const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);

                // Fetch today's entries
                const { data: entries } = await supabase.from('food_entries')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .gte('timestamp', startOfDay.getTime())
                    .order('timestamp', { ascending: false });

                // Fetch favorites
                const { data: favoritesData } = await supabase.from('favorites')
                    .select('*')
                    .eq('user_id', session.user.id);

                // Fetch all historical entries before today
                const { data: historicalEntries } = await supabase.from('food_entries')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .lt('timestamp', startOfDay.getTime())
                    .order('timestamp', { ascending: false });

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
                            daysMap.set(dateStr, { dateStr, kcal: 0, protein: 0, entries: [] });
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

                if (favoritesData) {
                    const parsedFavorites = favoritesData.map(f => ({
                        name: f.name,
                        kcal: Math.round(Number(f.kcal)),
                        protein: Math.round(Number(f.protein)),
                        carbs: Math.round(Number(f.carbs)),
                        fat: Math.round(Number(f.fat))
                    }));
                    set({ favorites: parsedFavorites });
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

            toggleExerciseDay: () => set((state) => ({ exerciseDay: !state.exerciseDay })),

            celebrationDismissedDate: null,
            dismissCelebration: () => set({ celebrationDismissedDate: new Date().toDateString() }),

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
                        target_kcal: kcal,
                        target_protein: protein,
                        updated_at: new Date().toISOString()
                    });
                    if (error) console.error('Supabase Sync Error:', error.message);
                }
            },

            addEntry: async (entry: Omit<FoodEntry, 'id' | 'timestamp'>) => {
                const newId = Math.random().toString(36).substring(7);
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
                    if (error) console.error('Supabase Sync Error:', error.message);
                }
            },

            updateEntry: async (id, updatedData) => {
                set((state) => {
                    const oldEntry = state.dailyLog.find(e => e.id === id);
                    if (!oldEntry) return state;

                    const kcalDiff = (updatedData.kcal ?? oldEntry.kcal) - oldEntry.kcal;
                    const proteinDiff = (updatedData.protein ?? oldEntry.protein) - oldEntry.protein;

                    return {
                        consumedKcal: Math.max(0, Math.round(state.consumedKcal + kcalDiff)),
                        consumedProtein: Math.max(0, Math.round(state.consumedProtein + proteinDiff)),
                        dailyLog: state.dailyLog.map(entry =>
                            entry.id === id ? { ...entry, ...updatedData } : entry
                        )
                    };
                });

                const { session, dailyLog } = get();
                const updated = dailyLog.find(e => e.id === id);
                if (session?.user && updated) {
                    const { error } = await supabase.from('food_entries').update({
                        name: updated.name,
                        kcal: updated.kcal,
                        protein: updated.protein,
                        carbs: updated.carbs,
                        fat: updated.fat,
                        timestamp: updated.timestamp,
                        requires_review: updated.requiresReview || false
                    }).eq('id', id);
                    if (error) console.error('Supabase Sync Error:', error.message);
                }
            },

            deleteEntry: async (id) => {
                set((state) => {
                    const entryToDelete = state.dailyLog.find(e => e.id === id);
                    if (!entryToDelete) return state;

                    return {
                        consumedKcal: Math.max(0, Math.round(state.consumedKcal - entryToDelete.kcal)),
                        consumedProtein: Math.max(0, Math.round(state.consumedProtein - entryToDelete.protein)),
                        dailyLog: state.dailyLog.filter(e => e.id !== id)
                    };
                });

                // Delete from cloud
                const { session } = get();
                if (session?.user) {
                    const { error } = await supabase.from('food_entries').delete().eq('id', id);
                    if (error) console.error('Supabase Delete Error:', error.message);
                }
            },

            resetDaily: () => set((state) => ({
                yesterdayKcal: state.consumedKcal,
                yesterdayProtein: state.consumedProtein,
                consumedKcal: 0,
                consumedProtein: 0,
                dailyLog: [],
                exerciseDay: false,
            })),

            resetAll: () => set(() => ({
                isCalibrated: false,
                isGuest: false,
                profile: null,
                targetKcal: 0,
                targetProtein: 0,
                consumedKcal: 0,
                consumedProtein: 0,
                dailyLog: []
            })),

            addFavorite: async (entry) => {
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
                    if (error) console.error('Supabase Sync Error:', error.message);
                }
            },

            removeFavorite: async (name) => {
                set((state) => ({
                    favorites: (state.favorites || []).filter(f => f.name !== name)
                }));

                const { session } = get();
                if (session?.user) {
                    const { error } = await supabase.from('favorites').delete().eq('user_id', session.user.id).eq('name', name);
                    if (error) console.error('Supabase Sync Error:', error.message);
                }
            },

            updateFavorite: async (oldName, updatedFav) => {
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
                        await supabase.from('favorites').delete().eq('user_id', session.user.id).eq('name', oldName);
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
                    if (error) console.error('Supabase Sync Error:', error.message);
                }
            }
        }),
        {
            name: 'macro-tracker-storage', // Keep local storage as a fallback/offline buffer
            version: 2, // Added celebration tracking
            migrate: (persistedState: any, version: number) => {
                if (version === 0 && persistedState) {
                    persistedState.favorites = [];
                }
                if (version < 2 && persistedState) {
                    persistedState.celebrationDismissedDate = null;
                }
                return (persistedState as AppState) || {} as AppState;
            }
        }
    )
);
