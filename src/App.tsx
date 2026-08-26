import { useState, useEffect, useMemo } from 'react';
import { useStore } from './store/useStore';
import { FlaskConical, Settings, Sparkles, Loader2 } from 'lucide-react';
import OnboardingModal from './components/OnboardingModal';
import MacroDashboard from './components/MacroDashboard';

import DailyLog from './components/DailyLog';
import CalendarHeatmap from './components/CalendarHeatmap';
import SmartLogging from './components/SmartLogging';
import PWAInstall from './components/PWAInstall';
import SettingsPanel from './components/SettingsPanel';
import AuthScreen from './components/AuthScreen';
import GlitterCelebration from './components/GlitterCelebration';
import { Analytics } from '@vercel/analytics/react';
import { isSupabaseConfigured, supabase } from './utils/supabase';

function App() {
    const { isCalibrated, session, setSession, isGuest, setGuestMode, yesterdayKcal, yesterdayProtein, targetKcal, targetProtein, celebrationDismissedDate, dismissCelebration, checkDayRollover } = useStore();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [manualCelebrate, setManualCelebrate] = useState(false);
    const [timeframe, setTimeframe] = useState<'day' | 'month'>('day');

    // Day rollover: detect new day and move consumed → yesterday
        // Day rollover: detect new day and move consumed -> yesterday
    useEffect(() => {
        checkDayRollover();
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') checkDayRollover();
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [checkDayRollover]);

    const shouldCelebrate = useMemo(() => {
        if (!isCalibrated || targetKcal === 0 || targetProtein === 0) return false;
        if (yesterdayKcal === 0 && yesterdayProtein === 0) return false;
        if (yesterdayKcal > targetKcal || yesterdayProtein < targetProtein) return false;
        const todayStr = new Date().toDateString();
        return celebrationDismissedDate !== todayStr;
    }, [isCalibrated, yesterdayKcal, yesterdayProtein, targetKcal, targetProtein, celebrationDismissedDate]);

    // Record today's celebration as shown immediately so page reloads do not replay it
    useEffect(() => {
        if (shouldCelebrate) {
            dismissCelebration();
        }
    }, [shouldCelebrate, dismissCelebration]);

    const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseConfigured);

    useEffect(() => {
        if (!isSupabaseConfigured) {
            setIsAuthLoading(false);
            return;
        }

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsAuthLoading(false);
        }).catch(() => {
            setIsAuthLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setIsAuthLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [setSession]);

    if (!isSupabaseConfigured && !isGuest) {
        return (
            <div className="min-h-screen bg-off-white text-brutal-black p-6 flex flex-col justify-center items-center">
                <div className="w-full max-w-md brutal-card p-6 sm:p-8">
                    <p className="font-sans text-[10px] uppercase tracking-[0.25em] opacity-50 mb-3">Local setup</p>
                    <h1 className="font-drama text-4xl mb-4">Supabase is not connected</h1>
                    <p className="font-sans text-sm leading-relaxed opacity-70 mb-6">
                        Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to
                        <code> .env.local</code>, then restart the dev server to enable sign-in and cloud sync.
                    </p>
                    <button
                        onClick={() => setGuestMode(true)}
                        className="w-full bg-brutal-black text-off-white p-4 font-sans text-sm tracking-widest uppercase font-bold hover:bg-brutal-black/90 transition-colors"
                    >
                        Continue as Guest
                    </button>
                    <p className="font-sans text-xs opacity-50 mt-4 text-center">
                        Guest mode keeps your test data in this browser only.
                    </p>
                </div>
            </div>
        );
    }

    // Basic mobile-first layout structure
    return (
        <div className="min-h-screen w-full flex flex-col relative pb-32">
            {/* Settings / PWA Install Bridge */}
            <nav className="py-4 px-4 flex justify-between items-center z-40 fixed top-0 w-full max-w-md mx-auto left-0 right-0 bg-off-white/90 backdrop-blur-2xl border-b border-brutal-black/5 shadow-sm">
                <h1 className="font-drama tracking-wide text-xl flex items-center gap-3 text-brutal-black drop-shadow-sm">
                    {(import.meta.env.VITE_APP_ENV === 'lab' || (typeof window !== 'undefined' && window.location.hostname.includes('lab'))) && (
                    <span
                        className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 font-sans text-[9px] font-bold uppercase tracking-[0.16em] text-violet-700 shadow-sm"
                        title="Lab environment"
                        aria-label="Lab environment"
                    >
                        <FlaskConical size={13} strokeWidth={2.4} aria-hidden="true" />
                        Lab
                    </span>
                    )}
                    MacroTrack
                    <span className="font-sans text-[9px] uppercase tracking-widest opacity-40 bg-black/5 px-2 py-0.5 rounded-full border border-black/5 leading-none mt-1">
                        by MiHo
                    </span>
                </h1>
                <div className="flex items-center gap-4 text-brutal-black">
                    <PWAInstall />
                    {isCalibrated && (
                        <>
                            <button
                                onClick={() => setManualCelebrate(true)}
                                className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-full hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center"
                                title="Celebrate"
                            >
                                <Sparkles size={18} strokeWidth={2} />
                            </button>
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="p-2 bg-brutal-black text-off-white rounded-full hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center"
                                title="Settings"
                            >
                                <Settings size={18} strokeWidth={2} />
                            </button>
                        </>
                    )}
                </div>
            </nav>

            <main className="flex-1 w-full max-w-md mx-auto px-4 pt-20 pb-40 flex flex-col gap-8">
                {isCalibrated ? (
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
                                                <div className="w-full flex items-center justify-center -mb-2">
                            <div className="bg-black/5 p-1 rounded-full border border-black/5 flex items-center gap-1 shadow-inner">
                                <button
                                    onClick={() => setTimeframe('day')}
                                    className={`px-5 py-1.5 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all ${timeframe === 'day' ? 'bg-brutal-black text-off-white shadow-md' : 'text-brutal-black/50 hover:text-brutal-black'}`}
                                >
                                    Day (Log)
                                </button>
                                <button
                                    onClick={() => setTimeframe('month')}
                                    className={`px-5 py-1.5 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all ${timeframe === 'month' ? 'bg-brutal-black text-off-white shadow-md' : 'text-brutal-black/50 hover:text-brutal-black'}`}
                                >
                                    Month (Calendar)
                                </button>
                            </div>
                        </div>

                        {timeframe === 'day' ? (
                            <>
                                <MacroDashboard />
                                <DailyLog />
                            </>
                        ) : (
                            <CalendarHeatmap />
                        )}

                        
                    </>
                ) : isAuthLoading ? (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 opacity-60">
                        <Loader2 className="w-8 h-8 animate-spin text-brutal-black" />
                        <span className="font-sans text-xs uppercase tracking-widest font-bold">Initializing telemetry...</span>
                    </div>
                ) : (!session && !isGuest) ? (
                    <AuthScreen />
                ) : (
                    <OnboardingModal />
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
            {shouldCelebrate && <GlitterCelebration onDismiss={dismissCelebration} />}
            {manualCelebrate && <GlitterCelebration onDismiss={() => setManualCelebrate(false)} />}
            <Analytics />
        </div>
    );
}

export default App;
