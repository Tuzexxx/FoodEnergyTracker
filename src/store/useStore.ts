import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Session } from '@supabase/supabase-js';

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
    isCalibrated: boolean;
    profile: UserProfile | null;
    targetKcal: number;
    targetProtein: number;
    consumedKcal: number;
    consumedProtein: number;
    dailyLog: FoodEntry[];
    calibrateUser: (profile: UserProfile, kcal: number, protein: number) => void;
    addEntry: (entry: Omit<FoodEntry, 'id' | 'timestamp'>) => void;
    updateEntry: (id: string, updatedData: Partial<Omit<FoodEntry, 'id' | 'timestamp'>>) => void;
    resetDaily: () => void;
    resetAll: () => void;
}

export const useStore = create<AppState>()(
    persist(
        (set) => ({
            session: null,
            setSession: (session) => set({ session }),
            isCalibrated: false,
            profile: null,
            targetKcal: 0,
            targetProtein: 0,
            consumedKcal: 0,
            consumedProtein: 0,
            dailyLog: [],

            calibrateUser: (profile, kcal, protein) => set(() => ({
                isCalibrated: true,
                profile,
                targetKcal: kcal,
                targetProtein: protein,
            })),

            addEntry: (entry) => set((state) => ({
                consumedKcal: state.consumedKcal + entry.kcal,
                consumedProtein: state.consumedProtein + entry.protein,
                dailyLog: [{
                    ...entry,
                    id: Math.random().toString(36).substring(7),
                    timestamp: Date.now()
                }, ...state.dailyLog]
            })),

            updateEntry: (id, updatedData) => set((state) => {
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
            }),

            resetDaily: () => set(() => ({
                consumedKcal: 0,
                consumedProtein: 0,
                dailyLog: []
            })),

            resetAll: () => set(() => ({
                isCalibrated: false,
                profile: null,
                targetKcal: 0,
                targetProtein: 0,
                consumedKcal: 0,
                consumedProtein: 0,
                dailyLog: []
            }))
        }),
        {
            name: 'macro-tracker-storage', // unique name
        }
    )
);
