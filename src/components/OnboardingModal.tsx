import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useStore } from '../store/useStore';
import { ArrowRight } from 'lucide-react';

const steps = [
    { id: 'gender', question: 'Identify primary physical blueprint:', options: ['MALE', 'FEMALE'] },
    { id: 'age', question: 'Enter operational age (years):', type: 'number', placeholder: 'e.g. 28' },
    { id: 'height', question: 'Enter vertical dimension (cm):', type: 'number', placeholder: 'e.g. 180' },
    { id: 'weight', question: 'Enter exact mass (kg):', type: 'number', placeholder: 'e.g. 75' },
    { id: 'goal', question: 'Select primary objective:', options: ['SHRED (Cut)', 'RECOMP (Maintain/Muscle)', 'TITAN (Bulk)'] }
];

const OnboardingModal = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const { calibrateUser } = useStore();

    const questionRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        // Animate in the current step
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
        // Simple mock macro calculation based on goal
        let multiplier = 24; // Base BMR mock (Maintain/Recomp)
        if (data.goal.includes('SHRED')) multiplier = 20;
        if (data.goal.includes('TITAN')) multiplier = 28;

        const targetKcal = Math.round(Number(data.weight) * multiplier);
        const targetProtein = Math.round(Number(data.weight) * 2.2); // 2.2g per kg mock

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

    return (
        <div className="fixed inset-0 z-50 bg-paper/95 backdrop-blur-xl flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-sm relative">
                <div className="absolute -top-12 left-0 font-data text-xs tracking-widest opacity-40">
                    SEQ {currentStep + 1} / {steps.length}
                </div>

                <h2 ref={questionRef} className="font-drama text-4xl leading-tight mb-12">
                    {step.question}
                </h2>

                <div ref={inputRef} className="flex flex-col gap-4">
                    {step.options ? (
                        step.options.map(opt => (
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
        </div>
    );
};

export default OnboardingModal;
