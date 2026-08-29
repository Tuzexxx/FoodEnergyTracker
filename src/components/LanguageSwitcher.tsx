import React from 'react';
import { useStore } from '../store/useStore';
import { Language } from '../utils/i18n';

interface LanguageSwitcherProps {
    className?: string;
    variant?: 'flags' | 'pill' | 'compact';
}

const languages: { code: Language; flag: string; label: string; name: string }[] = [
    { code: 'en', flag: '🇬🇧', label: 'EN', name: 'English' },
    { code: 'cs', flag: '🇨🇿', label: 'CS', name: 'Čeština' },
    { code: 'de', flag: '🇩🇪', label: 'DE', name: 'Deutsch' },
];

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '', variant = 'flags' }) => {
    const { language, setLanguage } = useStore();

    if (variant === 'pill') {
        return (
            <div className={`flex items-center gap-1 bg-black/5 p-1 rounded-2xl border border-black/5 ${className}`}>
                {languages.map(lang => (
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-sans text-xs font-bold uppercase tracking-wider transition-all ${
                            language === lang.code
                                ? 'bg-brutal-black text-off-white shadow-sm'
                                : 'text-brutal-black/50 hover:text-brutal-black hover:bg-black/5'
                        }`}
                        title={lang.name}
                    >
                        <span className="text-sm leading-none">{lang.flag}</span>
                        <span>{lang.label}</span>
                    </button>
                ))}
            </div>
        );
    }

    return (
        <div className={`inline-flex items-center gap-0.5 bg-black/5 p-0.5 rounded-full border border-black/5 shadow-inner shrink-0 ${className}`}>
            {languages.map(lang => {
                const isActive = language === lang.code;
                return (
                    <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`h-7 px-1.5 flex items-center justify-center gap-1 rounded-full text-xs font-bold font-sans transition-all active:scale-95 ${
                            isActive
                                ? 'bg-brutal-black text-off-white shadow-sm'
                                : 'text-brutal-black/60 hover:text-brutal-black hover:bg-black/5'
                        }`}
                        title={lang.name}
                        aria-label={`Switch language to ${lang.name}`}
                    >
                        <span className="text-sm leading-none">{lang.flag}</span>
                        <span className="text-[9px] uppercase font-bold tracking-tight">{lang.label}</span>
                    </button>
                );
            })}
        </div>
    );
};

export default LanguageSwitcher;
