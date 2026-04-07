import { useState, useEffect } from 'react';
import { Download, Share, X, Plus } from 'lucide-react';

const PWAInstall = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showIosGuide, setShowIosGuide] = useState(false);
    const [isIos, setIsIos] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Detect iOS Safari
        const ua = navigator.userAgent;
        const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const standalone = ('standalone' in navigator && (navigator as any).standalone) || window.matchMedia('(display-mode: standalone)').matches;

        setIsIos(ios);
        setIsStandalone(standalone);

        // Android / Chrome install prompt
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    // Already installed as PWA — hide button
    if (isStandalone) return null;

    // Android: native install prompt
    if (deferredPrompt) {
        const handleInstall = async () => {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        };

        return (
            <button
                onClick={handleInstall}
                className="btn-magnetic px-3 py-1.5 rounded-full bg-brutal-black text-off-white text-xs font-sans tracking-wider uppercase flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-md"
            >
                <Download size={14} /> Install App
            </button>
        );
    }

    // iOS: show guided instructions
    if (isIos) {
        return (
            <>
                <button
                    onClick={() => setShowIosGuide(true)}
                    className="btn-magnetic px-3 py-1.5 rounded-full bg-brutal-black text-off-white text-xs font-sans tracking-wider uppercase flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-md"
                >
                    <Download size={14} /> Install
                </button>

                {showIosGuide && (
                    <div className="fixed inset-0 z-[200] flex items-end justify-center" onClick={() => setShowIosGuide(false)}>
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

                        {/* Guide Card */}
                        <div
                            className="relative z-10 w-full max-w-md mx-auto mb-8 mx-4 bg-white rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-300"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close */}
                            <button
                                onClick={() => setShowIosGuide(false)}
                                className="absolute top-4 right-4 p-2 rounded-full bg-black/5 hover:bg-black/10 transition-colors z-10"
                            >
                                <X size={16} />
                            </button>

                            <div className="px-6 pt-6 pb-2">
                                <h3 className="font-sans font-bold text-lg text-brutal-black mb-1">
                                    Install MacroTrack
                                </h3>
                                <p className="text-sm text-brutal-black/60 font-sans leading-relaxed">
                                    Add this app to your Home Screen for the best experience — full screen, offline access &amp; instant launch.
                                </p>
                            </div>

                            <div className="px-6 py-4 flex flex-col gap-4">
                                {/* Step 1 */}
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0 shadow-sm">
                                        <span className="font-data text-lg font-bold text-indigo-600">1</span>
                                    </div>
                                    <div className="flex-1 pt-1.5">
                                        <p className="font-sans text-sm text-brutal-black leading-snug">
                                            Tap the <Share size={16} className="inline-block mx-1 text-indigo-600 -mt-0.5" /> <strong>Share</strong> button in Safari's toolbar
                                        </p>
                                    </div>
                                </div>

                                {/* Step 2 */}
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0 shadow-sm">
                                        <span className="font-data text-lg font-bold text-indigo-600">2</span>
                                    </div>
                                    <div className="flex-1 pt-1.5">
                                        <p className="font-sans text-sm text-brutal-black leading-snug">
                                            Scroll down and tap <Plus size={16} className="inline-block mx-1 text-indigo-600 -mt-0.5" /> <strong>Add to Home Screen</strong>
                                        </p>
                                    </div>
                                </div>

                                {/* Step 3 */}
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0 shadow-sm">
                                        <span className="font-data text-lg font-bold text-indigo-600">3</span>
                                    </div>
                                    <div className="flex-1 pt-1.5">
                                        <p className="font-sans text-sm text-brutal-black leading-snug">
                                            Tap <strong>Add</strong> to confirm — done!
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Arrow pointing down to Safari toolbar */}
                            <div className="flex justify-center pb-4 pt-2">
                                <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] border-t-brutal-black/20 animate-bounce" />
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Desktop or already installed — hide
    return null;
};

export default PWAInstall;
