import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FoodEntry {
    id: string;
    name: string;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
    timestamp: number;
}

interface UserProfile {
    height: number;
    weight: number;
    age: number;
    gender: string;
    goal: string;
}

interface AppState {
    isCalibrated: boolean;
    profile: UserProfile | null;
    targetKcal: number;
    targetProtein: number;
    consumedKcal: number;
    consumedProtein: number;
    dailyLog: FoodEntry[];
    calibrateUser: (profile: UserProfile, kcal: number, protein: number) => void;
    addEntry: (entry: Omit<FoodEntry, 'id' | 'timestamp'>) => void;
    resetDaily: () => void;
    resetAll: () => void;
}

export const useStore = create<AppState>()(
    persist(
        (set) => ({
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
