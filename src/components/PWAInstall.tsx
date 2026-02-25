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
            className="btn-magnetic px-3 py-1.5 rounded-full border border-brutal-black/20 text-xs font-sans tracking-wider uppercase flex items-center gap-2 hover:bg-brutal-black/5 transition-colors"
        >
            <Download size={14} /> Install App
        </button>
    );
};

export default PWAInstall;
