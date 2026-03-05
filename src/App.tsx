import { useState, useEffect, useMemo } from 'react';
import { useStore } from './store/useStore';
import { Settings } from 'lucide-react';
import OnboardingModal from './components/OnboardingModal';
import MacroDashboard from './components/MacroDashboard';
import DailyLog from './components/DailyLog';
import CalendarHeatmap from './components/CalendarHeatmap';
import SmartLogging from './components/SmartLogging';
import PWAInstall from './components/PWAInstall';
import SettingsPanel from './components/SettingsPanel';
import AuthScreen from './components/AuthScreen';
import UnicornCelebration from './components/UnicornCelebration';
import { Analytics } from '@vercel/analytics/react';
import { supabase } from './utils/supabase';

function App() {
    const { isCalibrated, session, setSession, isGuest, setGuestMode, yesterdayKcal, yesterdayProtein, targetKcal, targetProtein, celebrationDismissedDate, dismissCelebration } = useStore();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const shouldCelebrate = useMemo(() => {
        if (!isCalibrated || targetKcal === 0 || targetProtein === 0) return false;
        if (yesterdayKcal < targetKcal || yesterdayProtein < targetProtein) return false;
        const todayStr = new Date().toDateString();
        return celebrationDismissedDate !== todayStr;
    }, [isCalibrated, yesterdayKcal, yesterdayProtein, targetKcal, targetProtein, celebrationDismissedDate]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, [setSession]);

    // Basic mobile-first layout structure
    return (
        <div className="min-h-screen w-full flex flex-col relative pb-32">
            {/* Settings / PWA Install Bridge */}
            <nav className="py-4 px-4 flex justify-between items-center z-40 fixed top-0 w-full max-w-md mx-auto left-0 right-0 bg-off-white/90 backdrop-blur-2xl border-b border-brutal-black/5 shadow-sm">
                <h1 className="font-drama tracking-wide text-xl flex items-center gap-3 text-brutal-black drop-shadow-sm">
                    MacroTrack
                    <span className="font-sans text-[9px] uppercase tracking-widest opacity-40 bg-black/5 px-2 py-0.5 rounded-full border border-black/5 leading-none mt-1">
                        by MiHo
                    </span>
                </h1>
                <div className="flex items-center gap-4 text-brutal-black">
                    <PWAInstall />
                    {isCalibrated && (
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2 bg-brutal-black text-off-white rounded-full hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center"
                            title="Settings"
                        >
                            <Settings size={18} strokeWidth={2} />
                        </button>
                    )}
                </div>
            </nav>

            <main className="flex-1 w-full max-w-md mx-auto px-4 pt-20 pb-40 flex flex-col gap-8">
                {(!session && !isGuest) ? (
                    <AuthScreen />
                ) : !isCalibrated ? (
                    <OnboardingModal />
                ) : (
                    <>
                        {isGuest && (
                            <div className="w-full bg-indigo-50/80 backdrop-blur-md border border-indigo-200/50 text-indigo-900 p-4 rounded-3xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4">
                                <span className="text-xs font-sans font-bold uppercase tracking-wider opacity-80">Guest Mode</span>
                                <button
                                    onClick={() => setGuestMode(false)}
                                    className="bg-indigo-600 text-[10px] tracking-widest uppercase text-white px-4 py-2 rounded-full font-bold hover:bg-indigo-700 transition active:scale-95 shadow-md shadow-indigo-600/20"
                                >
                                    Log In / Save
                                </button>
                            </div>
                        )}
                        <MacroDashboard />
                        <DailyLog />
                        <CalendarHeatmap />
                    </>
                )}
            </main>

            {/* Floating Smart Input - bottom anchored */}
            {(session || isGuest) && isCalibrated && (
                <div className="fixed bottom-6 left-0 right-0 px-4 z-40 w-full max-w-md mx-auto pointer-events-none">
                    <div className="pointer-events-auto">
                        <SmartLogging />
                    </div>
                </div>
            )}

            {isSettingsOpen && <SettingsPanel onClose={() => setIsSettingsOpen(false)} />}
            {shouldCelebrate && <UnicornCelebration onDismiss={dismissCelebration} />}
            <Analytics />
        </div>
    );
}

export default App;
