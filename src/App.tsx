import { useStore } from './store/useStore';
import OnboardingModal from './components/OnboardingModal';
import MacroDashboard from './components/MacroDashboard';
import DailyLog from './components/DailyLog';
import SmartLogging from './components/SmartLogging';
import PWAInstall from './components/PWAInstall';

function App() {
    const { isCalibrated } = useStore();

    // Basic mobile-first layout structure
    return (
        <div className="min-h-screen w-full flex flex-col relative pb-32">
            {/* Settings / PWA Install Bridge */}
            <nav className="p-4 flex justify-between items-center z-40 fixed top-0 w-full max-w-md mx-auto left-0 right-0 mix-blend-difference text-paper">
                <h1 className="font-drama tracking-wide text-xl">MacroTrack</h1>
                <PWAInstall />
            </nav>

            <main className="flex-1 w-full max-w-md mx-auto px-4 pt-20 pb-8 flex flex-col gap-8">
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
        </div>
    );
}

export default App;
