import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useStore } from '../store/useStore';
import { X, Save, RefreshCw } from 'lucide-react';

const SettingsPanel = ({ onClose }: { onClose: () => void }) => {
    const { profile, resetAll, calibrateUser, resetDaily } = useStore();
    const [weight, setWeight] = useState(profile?.weight?.toString() || '');
    const [goal, setGoal] = useState(profile?.goal || 'MAINTAIN');

    const panelRef = useRef(null);

    useEffect(() => {
        gsap.fromTo(panelRef.current,
            { x: '100%' },
            { x: '0%', duration: 0.5, ease: 'power3.out' }
        );
    }, []);

    const handleClose = () => {
        gsap.to(panelRef.current, {
            x: '100%',
            duration: 0.4,
            ease: 'power3.in',
            onComplete: onClose
        });
    };

    const handleSave = () => {
        if (!profile) return;

        let multiplier = 24;
        if (goal === 'CUT') multiplier = 20;
        if (goal === 'BULK') multiplier = 28;

        const targetKcal = Math.round(Number(weight) * multiplier);
        const targetProtein = Math.round(Number(weight) * 2.2);

        calibrateUser(
            { ...profile, weight: Number(weight), goal },
            targetKcal,
            targetProtein
        );
        handleClose();
    };

    const handleWipe = () => {
        if (confirm("System Wipe: Are you sure you want to delete all local telemetry?")) {
            resetAll();
            handleClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
            <div ref={panelRef} className="w-full max-w-sm h-full bg-paper shadow-2xl flex flex-col pt-12">
                <div className="flex justify-between items-center p-6 border-b-2 border-brutal-black/10">
                    <h2 className="font-drama text-2xl tracking-wide">System Config</h2>
                    <button onClick={handleClose} className="p-2 hover:bg-brutal-black/5 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-8 flex-1 overflow-y-auto">
                    <div>
                        <label className="font-sans text-xs uppercase tracking-widest opacity-60 block mb-2">Mass Update (KG)</label>
                        <input
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="w-full bg-transparent border-b-2 border-brutal-black/20 focus:border-signal-red outline-none py-2 font-data text-3xl transition-colors"
                        />
                    </div>

                    <div>
                        <label className="font-sans text-xs uppercase tracking-widest opacity-60 block mb-4">Primary Objective</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['CUT', 'MAINTAIN', 'BULK'].map(g => (
                                <button
                                    key={g}
                                    onClick={() => setGoal(g)}
                                    className={`py-3 text-xs font-sans tracking-widest border transition-all ${goal === g ? 'bg-brutal-black text-off-white border-brutal-black' : 'border-brutal-black/20 hover:border-brutal-black/50'}`}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-auto flex flex-col gap-4">
                        <button
                            onClick={handleSave}
                            className="w-full brutal-card p-4 bg-signal-red text-off-white font-sans text-lg tracking-wide flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                        >
                            <Save size={20} /> Update Parameters
                        </button>

                        <div className="flex gap-4">
                            <button
                                onClick={() => { resetDaily(); handleClose(); }}
                                className="flex-1 py-3 text-xs tracking-widest uppercase font-sans border-2 border-brutal-black/10 hover:bg-brutal-black/5 flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={14} /> Clear Day
                            </button>
                            <button
                                onClick={handleWipe}
                                className="flex-1 py-3 text-xs tracking-widest uppercase font-sans border-2 border-red-500/20 text-red-500 hover:bg-red-500/10"
                            >
                                Wipe All
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
