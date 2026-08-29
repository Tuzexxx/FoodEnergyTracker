import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore, EXERCISE_BONUS_KCAL, EXERCISE_BONUS_PROTEIN } from '../store/useStore';
import { BrainCircuit, Activity, AlertTriangle, ShieldCheck, Zap, RefreshCw, CheckCircle2, Flame } from 'lucide-react';
import { playSound } from '../utils/audio';
import { isSupabaseConfigured, supabase } from '../utils/supabase';

interface MetabolicLeak {
    title: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
}

interface CoachAnalysisResult {
    type: 'success';
    grade: string;
    score: number;
    verdict: string;
    macroIntegrity: {
        status: 'PASS' | 'WARNING' | 'CRITICAL';
        score: number;
        comment: string;
    };
    nutrientTiming: {
        status: 'OPTIMAL' | 'SUBOPTIMAL' | 'CRITICAL';
        comment: string;
    };
    metabolicLeaks: MetabolicLeak[];
    directives: string[];
}

const AnalysisView: React.FC = () => {
    const { dailyLog, consumedKcal, consumedProtein, targetKcal, targetProtein, exerciseDay, profile, historicalDays } = useStore();

    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<CoachAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const effectiveKcal = targetKcal + (exerciseDay ? EXERCISE_BONUS_KCAL : 0);
    const effectiveProtein = targetProtein + (exerciseDay ? EXERCISE_BONUS_PROTEIN : 0);

    const consumedCarbs = useMemo(() => {
        return Math.round((dailyLog || []).reduce((sum, item) => sum + (item.carbs || 0), 0));
    }, [dailyLog]);

    const consumedFat = useMemo(() => {
        return Math.round((dailyLog || []).reduce((sum, item) => sum + (item.fat || 0), 0));
    }, [dailyLog]);

    const cacheKey = useMemo(() => {
        const todayStr = new Date().toDateString();
        return `macrotrack_coach_analysis_${todayStr}_${dailyLog.length}_${consumedKcal}_${exerciseDay ? 'gym' : 'rest'}`;
    }, [dailyLog.length, consumedKcal, exerciseDay]);

    // Load from local storage cache if available
    useEffect(() => {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                setAnalysis(JSON.parse(cached));
            } catch (e) {
                console.warn('Failed to parse cached coach analysis', e);
            }
        }
    }, [cacheKey]);

    const runAnalysis = useCallback(async () => {
        setLoading(true);
        setError(null);
        playSound('click');

        try {
            const { data: { session } } = isSupabaseConfigured
                ? await supabase.auth.getSession()
                : { data: { session: null } };
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
            else headers['X-Client-Mode'] = 'guest';

            const historicalSummary = (historicalDays || []).slice(0, 7).map(d => {
                return `${d.dateStr}: ${d.kcal} kcal, ${d.protein}g pro (${d.entries?.length || 0} meals)`;
            }).join('; ');

            const res = await fetch('/api/coach-analysis', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    dailyLog,
                    consumedKcal,
                    consumedProtein,
                    consumedCarbs,
                    consumedFat,
                    targetKcal: effectiveKcal,
                    targetProtein: effectiveProtein,
                    exerciseDay,
                    profile,
                    historicalSummary
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText || `Server error: ${res.status}`);
            }

            const data: CoachAnalysisResult = await res.json();
            if (data && data.grade) {
                setAnalysis(data);
                localStorage.setItem(cacheKey, JSON.stringify(data));
                playSound('targetHit');
            } else {
                throw new Error("Neplatná odpověď z analýzy.");
            }
        } catch (err: any) {
            console.error('Coaching analysis error:', err);
            setError(err.message || 'Nepodařilo se načíst analýzu. Zkuste to prosím znovu.');
            playSound('error');
        } finally {
            setLoading(false);
        }
    }, [dailyLog, consumedKcal, consumedProtein, consumedCarbs, consumedFat, effectiveKcal, effectiveProtein, exerciseDay, profile, historicalDays, cacheKey]);

    const getGradeStyle = (grade: string) => {
        if (grade.startsWith('A')) return 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/30';
        if (grade.startsWith('B')) return 'bg-indigo-600 text-white border-indigo-700 shadow-indigo-500/30';
        if (grade.startsWith('C')) return 'bg-amber-500 text-white border-amber-600 shadow-amber-500/30';
        return 'bg-signal-red text-white border-red-700 shadow-red-500/30';
    };

    const getStatusBadge = (status: string) => {
        if (status === 'PASS' || status === 'OPTIMAL') {
            return (
                <span className="flex items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <ShieldCheck size={12} /> {status}
                </span>
            );
        }
        if (status === 'WARNING' || status === 'SUBOPTIMAL') {
            return (
                <span className="flex items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle size={12} /> {status}
                </span>
            );
        }
        return (
            <span className="flex items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                <AlertTriangle size={12} /> {status}
            </span>
        );
    };

    return (
        <div className="w-full flex flex-col gap-5 animate-in fade-in duration-300">
            {/* Header Telemetry Banner */}
            <div className="brutal-card p-5 bg-black text-off-white border-2 border-brutal-black shadow-xl flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-600/30 rounded-xl text-indigo-400 border border-indigo-500/30">
                            <BrainCircuit size={18} className="animate-pulse" />
                        </div>
                        <div>
                            <span className="font-sans text-[9px] uppercase tracking-[0.25em] opacity-60 font-bold block">
                                AI Strategic Coaching Telemetry
                            </span>
                            <h2 className="font-sans text-base font-bold tracking-tight text-white flex items-center gap-2">
                                Analýza jídelníčku a koučing
                            </h2>
                        </div>
                    </div>

                    <button
                        onClick={runAnalysis}
                        disabled={loading}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-sans font-bold uppercase tracking-wider transition-all active:scale-95 shadow-md flex items-center gap-1.5 disabled:opacity-50"
                    >
                        <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                        <span>{loading ? "Analyzuji..." : analysis ? "Přepočítat" : "Spustit analýzu"}</span>
                    </button>
                </div>

                <div className="flex items-center gap-2 text-xs opacity-75 font-sans pt-1 border-t border-white/10">
                    <span className="flex items-center gap-1">
                        {exerciseDay ? <Flame size={13} className="text-amber-400 fill-amber-400" /> : <Activity size={13} className="text-indigo-400" />}
                        {exerciseDay ? "Tréninkový den (aktivní výdej)" : "Regenerační den (klidový režim)"}
                    </span>
                    <span>&middot;</span>
                    <span>{dailyLog.length} zaznamenaných jídel</span>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-sans flex items-start gap-2 animate-in fade-in">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                    <div className="flex-1">
                        <span className="font-bold block mb-0.5">Chyba při generování analýzy</span>
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {/* Empty state prompt to run analysis */}
            {!analysis && !loading && (
                <div className="brutal-card p-8 bg-white border-2 border-brutal-black/20 text-center flex flex-col items-center gap-4 rounded-3xl shadow-sm">
                    <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 border border-indigo-100">
                        <BrainCircuit size={32} />
                    </div>
                    <div className="max-w-xs">
                        <h3 className="font-sans font-bold text-base text-brutal-black mb-1">
                            Přísný nutriční audit na 1 klik
                        </h3>
                        <p className="text-xs text-brutal-black/60 font-sans leading-relaxed">
                            AI kouč prověří dnešní časování živin, poměr bílkovin, metabolické brzdy a připraví 3 striktní taktické pokyny na zítra.
                        </p>
                    </div>
                    <button
                        onClick={runAnalysis}
                        className="px-6 py-3 bg-brutal-black hover:bg-black text-off-white rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all active:scale-95 shadow-md flex items-center gap-2"
                    >
                        <Zap size={14} className="text-amber-400 fill-amber-400" />
                        <span>Analyzovat dnešní telemetrii</span>
                    </button>
                </div>
            )}

            {/* Loading state skeleton */}
            {loading && !analysis && (
                <div className="flex flex-col gap-4 py-8 items-center justify-center text-center opacity-70">
                    <div className="relative">
                        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
                        <BrainCircuit size={20} className="absolute inset-0 m-auto text-indigo-600 animate-pulse" />
                    </div>
                    <div>
                        <span className="font-sans text-xs uppercase tracking-widest font-bold text-brutal-black block mb-1">
                            Prověřuji metabolické úniky a časování...
                        </span>
                        <span className="text-[11px] text-brutal-black/50 font-sans">
                            Kouč analyzuje poměry makroživin a tréninkovou regeneraci
                        </span>
                    </div>
                </div>
            )}

            {/* Active Analysis Dashboard */}
            {analysis && (
                <div className="flex flex-col gap-5 animate-in fade-in duration-300">
                    {/* Grade & Verdict Card */}
                    <div className="brutal-card p-5 bg-white border-2 border-brutal-black rounded-3xl shadow-md flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-data text-2xl font-black border-2 shadow-lg ${getGradeStyle(analysis.grade)}`}>
                                    {analysis.grade}
                                </div>
                                <div>
                                    <span className="font-sans text-[10px] uppercase tracking-widest opacity-40 font-bold block">
                                        Celkové hodnocení dne
                                    </span>
                                    <span className="font-data text-xl font-bold text-brutal-black">
                                        {analysis.score} <span className="text-xs font-sans font-normal opacity-50">/ 100 bodů</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Verdict Quote */}
                        <div className="p-3.5 bg-black/5 rounded-2xl border border-black/5">
                            <p className="font-sans font-semibold text-xs text-brutal-black leading-snug">
                                &ldquo;{analysis.verdict}&rdquo;
                            </p>
                        </div>
                    </div>

                    {/* Macro Integrity & Nutrient Timing Cards */}
                    <div className="grid grid-cols-1 gap-3">
                        {/* 1. Macro Integrity */}
                        <div className="brutal-card p-4 bg-white border-2 border-brutal-black/20 rounded-2xl flex flex-col gap-2 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="font-sans text-xs font-bold uppercase tracking-wider text-brutal-black flex items-center gap-1.5">
                                    <Activity size={14} className="text-indigo-600" />
                                    Makro Integrita & Hustota
                                </span>
                                {getStatusBadge(analysis.macroIntegrity.status)}
                            </div>
                            <p className="text-xs text-brutal-black/80 font-sans leading-relaxed">
                                {analysis.macroIntegrity.comment}
                            </p>
                        </div>

                        {/* 2. Nutrient Timing & Gym Sync */}
                        <div className="brutal-card p-4 bg-white border-2 border-brutal-black/20 rounded-2xl flex flex-col gap-2 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="font-sans text-xs font-bold uppercase tracking-wider text-brutal-black flex items-center gap-1.5">
                                    <Zap size={14} className="text-amber-500" />
                                    Časování živin & Regenerace
                                </span>
                                {getStatusBadge(analysis.nutrientTiming.status)}
                            </div>
                            <p className="text-xs text-brutal-black/80 font-sans leading-relaxed">
                                {analysis.nutrientTiming.comment}
                            </p>
                        </div>
                    </div>

                    {/* Metabolic Leaks Section */}
                    {analysis.metabolicLeaks && analysis.metabolicLeaks.length > 0 && (
                        <div className="flex flex-col gap-2.5">
                            <div className="flex items-center gap-1.5 px-1">
                                <AlertTriangle size={14} className="text-rose-500" />
                                <h3 className="font-sans text-[11px] uppercase tracking-[0.2em] font-bold opacity-60">
                                    Odhalené metabolické brzdy a úniky
                                </h3>
                            </div>

                            <div className="flex flex-col gap-2">
                                {analysis.metabolicLeaks.map((leak, idx) => (
                                    <div key={idx} className="p-3.5 bg-rose-50/70 border border-rose-200/80 rounded-2xl flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-sans font-bold text-xs text-rose-900 flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                                                {leak.title}
                                            </span>
                                            <span className={`text-[8px] font-sans font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                                leak.severity === 'high' ? 'bg-rose-600 text-white' : 'bg-rose-200 text-rose-800'
                                            }`}>
                                                {leak.severity === 'high' ? 'Vysoká priorita' : 'Střední'}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-rose-800/80 font-sans leading-relaxed">
                                            {leak.description}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tactical Directives for Tomorrow */}
                    {analysis.directives && analysis.directives.length > 0 && (
                        <div className="flex flex-col gap-2.5 pt-1">
                            <div className="flex items-center gap-1.5 px-1">
                                <CheckCircle2 size={14} className="text-indigo-600" />
                                <h3 className="font-sans text-[11px] uppercase tracking-[0.2em] font-bold opacity-60">
                                    3 Taktické direktivy pro zítřek
                                </h3>
                            </div>

                            <div className="flex flex-col gap-2">
                                {analysis.directives.map((directive, idx) => (
                                    <div key={idx} className="p-3.5 bg-white border-2 border-brutal-black/20 rounded-2xl flex items-start gap-3 shadow-xs">
                                        <span className="w-5 h-5 rounded-full bg-brutal-black text-white font-data text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                                            {idx + 1}
                                        </span>
                                        <p className="text-xs font-sans font-semibold text-brutal-black leading-snug flex-1">
                                            {directive}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AnalysisView;
