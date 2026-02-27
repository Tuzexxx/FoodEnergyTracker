import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';

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

interface UserProfile {
    height: number;
    weight: number;
    age: number;
    gender: string;
    goal: string;
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

                // Fetch today's entries
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                const { data: entries } = await supabase.from('food_entries')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .gte('timestamp', startOfDay.getTime())
                    .order('timestamp', { ascending: false });

                if (profileData) {
                    set({
                        isCalibrated: true,
                        profile: {
                            height: profileData.height,
                            weight: profileData.weight,
                            age: profileData.age,
                            gender: profileData.gender,
                            goal: profileData.goal
                        },
                        targetKcal: profileData.target_kcal,
                        targetProtein: profileData.target_protein
                    });
                }

                if (entries) {
                    let totalKcal = 0;
                    let totalProtein = 0;
                    const parsedEntries = entries.map(e => {
                        totalKcal += Number(e.kcal);
                        totalProtein += Number(e.protein);
                        return {
                            id: e.id,
                            name: e.name,
                            kcal: Number(e.kcal),
                            protein: Number(e.protein),
                            carbs: Number(e.carbs),
                            fat: Number(e.fat),
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
            },

            isCalibrated: false,
            profile: null,
            targetKcal: 0,
            targetProtein: 0,
            consumedKcal: 0,
            consumedProtein: 0,
            dailyLog: [],
            favorites: [],

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
                    consumedKcal: state.consumedKcal + entry.kcal,
                    consumedProtein: state.consumedProtein + entry.protein,
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
                        consumedKcal: Math.max(0, state.consumedKcal + kcalDiff),
                        consumedProtein: Math.max(0, state.consumedProtein + proteinDiff),
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
                        consumedKcal: Math.max(0, state.consumedKcal - entryToDelete.kcal),
                        consumedProtein: Math.max(0, state.consumedProtein - entryToDelete.protein),
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

            resetDaily: () => set(() => ({
                consumedKcal: 0,
                consumedProtein: 0,
                dailyLog: []
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

            addFavorite: (entry) => set((state) => ({
                favorites: [...(state.favorites || []).filter(f => f.name !== entry.name), entry]
            })),

            removeFavorite: (name) => set((state) => ({
                favorites: (state.favorites || []).filter(f => f.name !== name)
            }))
        }),
        {
            name: 'macro-tracker-storage', // Keep local storage as a fallback/offline buffer
            version: 1, // Added version tracking
            migrate: (persistedState: any, version: number) => {
                if (version === 0 && persistedState) {
                    // if the stored value is in version 0, we add favorites
                    persistedState.favorites = [];
                }
                return (persistedState as AppState) || {} as AppState;
            }
        }
    )
);
