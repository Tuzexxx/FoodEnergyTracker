import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useStore } from '../store/useStore';
import { X, Save, RefreshCw, LogOut, Info, ChevronDown, Globe } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { calculateTargets, ACTIVITY_LEVELS } from '../utils/calorieFormula';
import { getTranslation } from '../utils/i18n';
import LanguageSwitcher from './LanguageSwitcher';

const SettingsPanel = ({ onClose }: { onClose: () => void }) => {
    const { profile, targetKcal, targetProtein, resetAll, calibrateUser, resetDaily, session, isGuest, language } = useStore();
    const t = getTranslation(language);

    const [weight, setWeight] = useState(profile?.weight?.toString() || '');
    const [height, setHeight] = useState(profile?.height?.toString() || '');
    const [age, setAge] = useState(profile?.age?.toString() || '');
    const [gender, setGender] = useState(profile?.gender || 'MALE');
    const [activityLevel, setActivityLevel] = useState(profile?.activityLevel || 'LIGHT');
    const [goal, setGoal] = useState(profile?.goal || 'RECOMP (Maintain/Muscle)');
    const [customKcal, setCustomKcal] = useState('');
    const [customProtein, setCustomProtein] = useState('');
    const [showCustom, setShowCustom] = useState(false);
    const [showActivity, setShowActivity] = useState(false);
    const [showGoal, setShowGoal] = useState(false);

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

        const calculated = calculateTargets({
            weight: Number(weight),
            height: Number(height),
            age: Number(age),
            gender,
            goal,
            activityLevel,
        });

        // Use custom override if provided, otherwise use calculated
        const finalKcal = customKcal ? Number(customKcal) : calculated.targetKcal;
        const finalProtein = customProtein ? Number(customProtein) : calculated.targetProtein;

        calibrateUser(
            { ...profile, weight: Number(weight), height: Number(height), age: Number(age), gender, goal, activityLevel },
            finalKcal,
            finalProtein
        );
        handleClose();
    };

    const handleWipe = () => {
        if (confirm(t.settings.wipeConfirm)) {
            resetAll();
            handleClose();
        }
    };

    const handleSignOut = async () => {
        if (confirm(t.settings.signOutConfirm)) {
            await supabase.auth.signOut();
            resetAll();
            handleClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={handleClose}>
            <div ref={panelRef} className="w-full max-w-sm h-full bg-paper shadow-2xl flex flex-col pt-12" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b-2 border-brutal-black/10">
                    <h2 className="font-drama text-2xl tracking-wide">{t.settings.title}</h2>
                    <button onClick={handleClose} className="p-2 hover:bg-brutal-black/5 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-5 flex-1 overflow-y-auto">
                    {/* Language Selector */}
                    <div className="p-3 bg-black/5 rounded-2xl border border-black/5 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 opacity-60">
                            <Globe size={14} />
                            <label className="font-sans text-xs uppercase tracking-widest font-bold">{t.settings.language}</label>
                        </div>
                        <LanguageSwitcher variant="pill" />
                    </div>

                    {/* Gender */}
                    <div>
                        <label className="font-sans text-xs uppercase tracking-widest opacity-60 block mb-2">{t.settings.sex}</label>
                        <div className="flex gap-2">
                            {['MALE', 'FEMALE'].map(g => (
                                <button
                                    key={g}
                                    onClick={() => setGender(g)}
                                    className={`flex-1 py-2 text-xs font-sans tracking-widest border transition-all ${gender === g ? 'bg-brutal-black text-off-white border-brutal-black' : 'border-brutal-black/20 hover:border-brutal-black/50'}`}
                                >
                                    {g === 'MALE' ? t.settings.male : t.settings.female}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Age + Height */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="font-sans text-xs uppercase tracking-widest opacity-60 block mb-2">{t.settings.age}</label>
                            <input
                                type="number"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                className="w-full bg-transparent border-b-2 border-brutal-black/20 focus:border-signal-red outline-none py-1 font-data text-xl transition-colors"
                            />
                        </div>
                        <div>
                            <label className="font-sans text-xs uppercase tracking-widest opacity-60 block mb-2">{t.settings.height}</label>
                            <input
                                type="number"
                                value={height}
                                onChange={(e) => setHeight(e.target.value)}
                                className="w-full bg-transparent border-b-2 border-brutal-black/20 focus:border-signal-red outline-none py-1 font-data text-xl transition-colors"
                            />
                        </div>
                    </div>

                    {/* Weight — prominent, changes often */}
                    <div>
                        <label className="font-sans text-xs uppercase tracking-widest opacity-60 block mb-2">{t.settings.weight}</label>
                        <input
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            className="w-full bg-transparent border-b-2 border-brutal-black/20 focus:border-signal-red outline-none py-2 font-data text-3xl transition-colors"
                        />
                    </div>

                    {/* Activity Level — collapsible with slider */}
                    <div>
                        <button
                            onClick={() => setShowActivity(v => !v)}
                            className="flex items-center justify-between w-full py-1 group hover:opacity-80 transition-opacity"
                        >
                            <span className="font-sans text-xs uppercase tracking-widest opacity-60">{t.settings.activityLevel}</span>
                            <div className="flex items-center gap-2">
                                <span className="font-sans text-xs opacity-40 group-hover:opacity-60 transition-opacity">
                                    {ACTIVITY_LEVELS.find(a => a.value === activityLevel)?.label}
                                </span>
                                <ChevronDown size={14} className={`opacity-40 transition-all duration-200 ${showActivity ? 'rotate-180 opacity-60' : ''}`} />
                            </div>
                        </button>
                        {showActivity && (() => {
                            const idx = Math.max(0, ACTIVITY_LEVELS.findIndex(a => a.value === activityLevel));
                            const current = ACTIVITY_LEVELS[idx];
                            return (
                                <div className="mt-3 flex flex-col gap-3">
                                    <input
                                        type="range"
                                        min={0}
                                        max={ACTIVITY_LEVELS.length - 1}
                                        step={1}
                                        value={idx}
                                        onChange={e => setActivityLevel(ACTIVITY_LEVELS[Number(e.target.value)].value)}
                                        className="w-full h-1 appearance-none bg-brutal-black/15 rounded-full outline-none cursor-pointer
                                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brutal-black
                                            [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md
                                            [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
                                            [&::-moz-range-thumb]:bg-brutal-black [&::-moz-range-thumb]:border-0"
                                    />
                                    {/* tick labels */}
                                    <div className="flex justify-between -mt-1">
                                        {ACTIVITY_LEVELS.map((a, i) => (
                                            <span
                                                key={a.value}
                                                className={`font-sans text-[9px] uppercase tracking-widest transition-opacity ${i === idx ? 'opacity-70 font-bold' : 'opacity-25'}`}
                                                style={{ width: `${100 / ACTIVITY_LEVELS.length}%`, textAlign: i === 0 ? 'left' : i === ACTIVITY_LEVELS.length - 1 ? 'right' : 'center' }}
                                            >
                                                {a.label}
                                            </span>
                                        ))}
                                    </div>
                                    <p className="font-sans text-[10px] opacity-40 leading-relaxed border-l-2 border-brutal-black/10 pl-3">
                                        <span className="font-bold opacity-80">PAL ×{current.pal}</span> — {current.description}
                                    </p>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Primary Objective — collapsible */}
                    <div>
                        <button
                            onClick={() => setShowGoal(v => !v)}
                            className="flex items-center justify-between w-full py-1 group hover:opacity-80 transition-opacity"
                        >
                            <span className="font-sans text-xs uppercase tracking-widest opacity-60">{t.settings.objective}</span>
                            <div className="flex items-center gap-2">
                                <span className="font-sans text-xs opacity-40 group-hover:opacity-60 transition-opacity">
                                    {goal.split(' ')[0]}
                                </span>
                                <ChevronDown size={14} className={`opacity-40 transition-all duration-200 ${showGoal ? 'rotate-180 opacity-60' : ''}`} />
                            </div>
                        </button>
                        {showGoal && (
                            <div className="flex flex-col gap-2 mt-3">
                                {['SHRED (Cut)', 'RECOMP (Maintain/Muscle)', 'TITAN (Bulk)'].map(g => (
                                    <button
                                        key={g}
                                        onClick={() => setGoal(g)}
                                        className={`py-3 text-xs font-sans tracking-widest border transition-all ${goal === g ? 'bg-brutal-black text-off-white border-brutal-black' : 'border-brutal-black/20 hover:border-brutal-black/50'}`}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Custom override — collapsed by default */}
                    <div>
                        <button
                            onClick={() => setShowCustom(v => !v)}
                            className="flex items-center justify-between w-full mb-2"
                        >
                            <label className="font-sans text-xs uppercase tracking-widest opacity-60 pointer-events-none">{t.settings.customTargets}</label>
                            <Info size={13} className={`transition-opacity ${showCustom ? 'opacity-60' : 'opacity-30'}`} />
                        </button>
                        {showCustom && (
                            <>
                                <p className="font-sans text-[10px] opacity-50 leading-relaxed mb-3 border-l-2 border-brutal-black/10 pl-3">
                                    {t.settings.customTargetsDesc}
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-sans text-[10px] uppercase opacity-40 block mb-1">{t.common.kcal} / {t.tabs.day.toLowerCase()}</label>
                                        <input
                                            type="number"
                                            placeholder={`auto: ${targetKcal}`}
                                            value={customKcal}
                                            onChange={(e) => setCustomKcal(e.target.value)}
                                            className="w-full bg-transparent border-b-2 border-brutal-black/20 focus:border-signal-red outline-none py-1 font-data text-lg transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-sans text-[10px] uppercase opacity-40 block mb-1">{t.common.protein} (g) / {t.tabs.day.toLowerCase()}</label>
                                        <input
                                            type="number"
                                            placeholder={`auto: ${targetProtein}`}
                                            value={customProtein}
                                            onChange={(e) => setCustomProtein(e.target.value)}
                                            className="w-full bg-transparent border-b-2 border-brutal-black/20 focus:border-signal-red outline-none py-1 font-data text-lg transition-colors"
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="mt-auto flex flex-col gap-4">
                        <button
                            onClick={handleSave}
                            className="w-full brutal-card p-4 bg-signal-red text-off-white font-sans text-lg tracking-wide flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                        >
                            <Save size={20} /> {t.common.save}
                        </button>

                        <div className="flex gap-4">
                            <button
                                onClick={() => { resetDaily(); handleClose(); }}
                                className="flex-1 py-3 text-xs tracking-widest uppercase font-sans border-2 border-brutal-black/10 hover:bg-brutal-black/5 flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={14} /> {t.common.reset} {t.tabs.day}
                            </button>
                            <button
                                onClick={handleWipe}
                                className="flex-1 py-3 text-xs tracking-widest uppercase font-sans border-2 border-red-500/20 text-red-500 hover:bg-red-500/10"
                            >
                                {t.settings.wipeTitle}
                            </button>
                        </div>

                        {!isGuest && (
                            <button
                                onClick={handleSignOut}
                                className="w-full mt-2 py-4 text-xs tracking-widest uppercase font-sans border-2 border-brutal-black hover:bg-brutal-black hover:text-off-white flex items-center justify-center gap-2 transition-colors"
                            >
                                <LogOut size={14} /> {t.settings.signOut}
                            </button>
                        )}

                        {(session?.user?.email || isGuest) && (
                            <span className="text-[10px] font-sans text-center text-brutal-black/30 w-full truncate px-2">
                                {isGuest ? `${t.common.guestMode}` : `${session?.user?.email}`}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
