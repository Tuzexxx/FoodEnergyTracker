import { useState } from 'react';
import { useStore } from './store/useStore';
import { Settings } from 'lucide-react';
import OnboardingModal from './components/OnboardingModal';
import MacroDashboard from './components/MacroDashboard';
import DailyLog from './components/DailyLog';
import SmartLogging from './components/SmartLogging';
import PWAInstall from './components/PWAInstall';
import SettingsPanel from './components/SettingsPanel';

function App() {
    const { isCalibrated } = useStore();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Basic mobile-first layout structure
    return (
        <div className="min-h-screen w-full flex flex-col relative pb-32">
            {/* Settings / PWA Install Bridge */}
            <nav className="p-4 flex justify-between items-center z-40 fixed top-0 w-full max-w-md mx-auto left-0 right-0">
                <h1 className="font-drama tracking-wide text-xl flex items-center gap-2 text-brutal-black drop-shadow-sm">
                    MacroTrack
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
                {!isCalibrated ? (
                    <OnboardingModal />
                ) : (
                    <>
                        <MacroDashboard />
                        <DailyLog />
                    </>
                )}
            </main>

            {/* Floating Smart Input - bottom anchored */}
            {isCalibrated && (
                <div className="fixed bottom-0 left-0 right-0 p-4 z-40 w-full max-w-md mx-auto bg-gradient-to-t from-off-white via-off-white to-transparent pt-12">
                    <SmartLogging />
                </div>
            )}

            {isSettingsOpen && <SettingsPanel onClose={() => setIsSettingsOpen(false)} />}
        </div>
    );
}

export default App;
