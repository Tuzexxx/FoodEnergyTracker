import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useStore } from '../store/useStore';
import { ArrowRight, Info, X } from 'lucide-react';
import { calculateTargets } from '../utils/calorieFormula';

const goalOptions = [
    {
        value: 'SHRED (Cut)',
        intent: 'Lose fat, preserve muscle',
        description: 'Puts you in a −20% caloric deficit. High protein (2.2g/kg) acts as insurance against muscle loss while your body burns fat.',
    },
    {
        value: 'RECOMP (Maintain/Muscle)',
        intent: 'Build muscle & lose fat simultaneously',
        description: 'Maintenance calories. Requires the highest protein (2.4g/kg) because your body must simultaneously build new muscle and prevent breakdown — the hardest goal.',
    },
    {
        value: 'TITAN (Bulk)',
        intent: 'Maximize muscle mass',
        description: 'A +15% caloric surplus gives your body extra energy for growth. Moderate protein (1.8g/kg) — the surplus carbs/fat spare protein\'s energy role.',
    },
];

const infoText = `Formula: Mifflin-St Jeor BMR × PAL × Goal Modifier

BMR (male):   10×weight + 6.25×height − 5×age + 5
BMR (female): 10×weight + 6.25×height − 5×age − 161

PAL baseline: ×1.375 (light activity — daily walking)
Exercise day: +400 kcal / +25 g protein added manually.

Goal modifiers:
  SHRED  — ×0.80 kcal | 2.2 g/kg protein
  RECOMP — ×1.00 kcal | 2.4 g/kg protein
  TITAN  — ×1.15 kcal | 1.8 g/kg protein

Sources: Mifflin et al. (1990) AJCN; Helms et al. (2014) JISSN;
Barakat et al. (2020) S&C Journal; Morton et al. (2017) BJSM.`;

const steps = [
    { id: 'gender', question: 'Identify primary physical blueprint:', options: ['MALE', 'FEMALE'] },
    { id: 'age', question: 'Enter operational age (years):', type: 'number', placeholder: 'e.g. 28' },
    { id: 'height', question: 'Enter vertical dimension (cm):', type: 'number', placeholder: 'e.g. 180' },
    { id: 'weight', question: 'Enter exact mass (kg):', type: 'number', placeholder: 'e.g. 75' },
    { id: 'goal', question: 'Select primary objective:' },
];

const OnboardingModal = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [showInfo, setShowInfo] = useState(false);
    const { calibrateUser } = useStore();

    const questionRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        gsap.fromTo(
            [questionRef.current, inputRef.current],
            { y: 20, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: 'power3.out' }
        );
    }, [currentStep]);

    const handleNext = (val?: string | number) => {
        const value = val || formData[steps[currentStep].id];
        if (!value) return;

        setFormData(prev => ({ ...prev, [steps[currentStep].id]: value }));

        gsap.to([questionRef.current, inputRef.current], {
            y: -20,
            opacity: 0,
            duration: 0.4,
            ease: 'power3.in',
            onComplete: () => {
                if (currentStep < steps.length - 1) {
                    setCurrentStep(c => c + 1);
                } else {
                    finishCalibration({ ...formData, [steps[currentStep].id]: value });
                }
            }
        });
    };

    const finishCalibration = (data: any) => {
        const { targetKcal, targetProtein } = calculateTargets({
            weight: Number(data.weight),
            height: Number(data.height),
            age: Number(data.age),
            gender: data.gender,
            goal: data.goal,
        });

        calibrateUser(
            {
                gender: data.gender,
                age: Number(data.age),
                height: Number(data.height),
                weight: Number(data.weight),
                goal: data.goal
            },
            targetKcal,
            targetProtein
        );
    };

    const step = steps[currentStep];
    const isGoalStep = step.id === 'goal';

    return (
        <div className="fixed inset-0 z-50 bg-paper/95 backdrop-blur-xl flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm relative">
                <div className="absolute -top-12 left-0 font-data text-xs tracking-widest opacity-40">
                    SEQ {currentStep + 1} / {steps.length}
                </div>

                {/* Info icon — always visible */}
                <button
                    onClick={() => setShowInfo(true)}
                    className="absolute -top-12 right-0 p-1 opacity-30 hover:opacity-70 transition-opacity"
                    title="Formula assumptions"
                >
                    <Info size={16} />
                </button>

                <h2 ref={questionRef} className="font-drama text-4xl leading-tight mb-12">
                    {step.question}
                </h2>

                <div ref={inputRef} className="flex flex-col gap-3">
                    {isGoalStep ? (
                        goalOptions.map(opt => (
                            <button
                                key={opt.value}
                                onClick={() => handleNext(opt.value)}
                                className="brutal-card p-4 text-left hover:bg-brutal-black hover:text-off-white transition-colors duration-300 group flex flex-col gap-1"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="font-sans text-lg tracking-wide">{opt.value}</span>
                                    <ArrowRight className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" size={18} />
                                </div>
                                <span className="font-sans text-xs opacity-60 group-hover:opacity-80 leading-snug">{opt.intent}</span>
                                <span className="font-sans text-[11px] opacity-40 group-hover:opacity-60 leading-snug mt-0.5">{opt.description}</span>
                            </button>
                        ))
                    ) : step.options ? (
                        step.options.map((opt: string) => (
                            <button
                                key={opt}
                                onClick={() => handleNext(opt)}
                                className="brutal-card p-4 text-left font-sans text-xl tracking-wide hover:bg-brutal-black hover:text-off-white transition-colors duration-300 group flex justify-between items-center"
                            >
                                {opt}
                                <ArrowRight className="opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
                            </button>
                        ))
                    ) : (
                        <div className="relative">
                            <input
                                autoFocus
                                type="number"
                                placeholder={step.placeholder}
                                value={formData[step.id] || ''}
                                onChange={(e) => setFormData(p => ({ ...p, [step.id]: e.target.value }))}
                                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                                className="w-full bg-transparent border-b-2 border-brutal-black/20 focus:border-signal-red outline-none py-4 font-data text-4xl transition-colors"
                            />
                            <button
                                onClick={() => handleNext()}
                                className="absolute right-0 bottom-4 text-brutal-black/40 hover:text-signal-red transition-colors"
                            >
                                <ArrowRight size={32} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Info modal */}
            {showInfo && (
                <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowInfo(false)}>
                    <div className="bg-paper rounded-2xl shadow-2xl p-6 max-w-sm w-full relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setShowInfo(false)} className="absolute top-4 right-4 opacity-40 hover:opacity-100 transition-opacity">
                            <X size={18} />
                        </button>
                        <h3 className="font-drama text-xl mb-4">Formula Assumptions</h3>
                        <pre className="font-sans text-[11px] leading-relaxed opacity-70 whitespace-pre-wrap">{infoText}</pre>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OnboardingModal;
