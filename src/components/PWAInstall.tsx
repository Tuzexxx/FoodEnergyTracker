import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

const PWAInstall = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        });
    }, []);

    if (!deferredPrompt) return null;

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
};

export default PWAInstall;
