import { useState, useEffect } from 'react';
import { useStore } from './store/useStore';
import { Settings } from 'lucide-react';
import OnboardingModal from './components/OnboardingModal';
import MacroDashboard from './components/MacroDashboard';
import DailyLog from './components/DailyLog';
import SmartLogging from './components/SmartLogging';
import PWAInstall from './components/PWAInstall';
import SettingsPanel from './components/SettingsPanel';
import AuthScreen from './components/AuthScreen';
import { Analytics } from '@vercel/analytics/react';
import { supabase } from './utils/supabase';

function App() {
    const { isCalibrated, session, setSession, isGuest } = useStore();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
                        <MacroDashboard />
                        <DailyLog />
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
            <Analytics />
        </div>
    );
}

export default App;
