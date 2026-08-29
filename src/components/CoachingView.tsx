import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore, EXERCISE_BONUS_KCAL, EXERCISE_BONUS_PROTEIN } from '../store/useStore';
import { BrainCircuit, Activity, AlertTriangle, ShieldCheck, Zap, RefreshCw, CheckCircle2, Flame, Lock } from 'lucide-react';
import { playSound } from '../utils/audio';
import { isSupabaseConfigured, supabase } from '../utils/supabase';
import { getTranslation } from '../utils/i18n';

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

export type CoachingPeriod = 'yesterday' | 'today' | '7d';

const CoachingView: React.FC = () => {
    const [period, setPeriod] = useState<CoachingPeriod>('today');
    const { dailyLog, consumedKcal, consumedProtein, targetKcal, targetProtein, exerciseDay, profile, historicalDays, language } = useStore();
    const t = getTranslation(language);

    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<CoachAnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Resolve yesterday data from historicalDays
    const yesterdayData = useMemo(() => {
        if (!historicalDays || historicalDays.length === 0) return null;
        const yDate = new Date();
        yDate.setDate(yDate.getDate() - 1);
        const yIso = yDate.toISOString().split('T')[0];
        
        return historicalDays.find(d => {
            const dObj = new Date(d.dateStr);
            return !isNaN(dObj.getTime()) && (
                d.dateStr.startsWith(yIso) ||
                dObj.toDateString() === yDate.toDateString()
            );
        }) || historicalDays[0];
    }, [historicalDays]);

    // Compute active payload values based on period
    const activeData = useMemo(() => {
        if (period === 'yesterday') {
            const yEntries = yesterdayData?.entries || [];
            const yKcal = yesterdayData?.kcal || 0;
            const yProtein = yesterdayData?.protein || 0;
            const yCarbs = yEntries.reduce((sum, item) => sum + (item.carbs || 0), 0);
            const yFat = yEntries.reduce((sum, item) => sum + (item.fat || 0), 0);
            const yTargetKcal = (yesterdayData?.targetKcal || targetKcal) + (yesterdayData?.exerciseDay ? EXERCISE_BONUS_KCAL : 0);
            const yTargetProtein = (yesterdayData?.targetProtein || targetProtein) + (yesterdayData?.exerciseDay ? EXERCISE_BONUS_PROTEIN : 0);

            return {
                log: yEntries,
                kcal: yKcal,
                protein: yProtein,
                carbs: Math.round(yCarbs),
                fat: Math.round(yFat),
                targetKcal: yTargetKcal,
                targetProtein: yTargetProtein,
                isExercise: Boolean(yesterdayData?.exerciseDay),
                hasData: Boolean(yesterdayData && (yEntries.length > 0 || yKcal > 0))
            };
        }

        const carbs = Math.round((dailyLog || []).reduce((sum, item) => sum + (item.carbs || 0), 0));
        const fat = Math.round((dailyLog || []).reduce((sum, item) => sum + (item.fat || 0), 0));
        const effKcal = targetKcal + (exerciseDay ? EXERCISE_BONUS_KCAL : 0);
        const effProtein = targetProtein + (exerciseDay ? EXERCISE_BONUS_PROTEIN : 0);

        return {
            log: dailyLog || [],
            kcal: consumedKcal,
            protein: consumedProtein,
            carbs,
            fat,
            targetKcal: effKcal,
            targetProtein: effProtein,
            isExercise: exerciseDay,
            hasData: (dailyLog || []).length >= 3
        };
    }, [period, yesterdayData, dailyLog, consumedKcal, consumedProtein, targetKcal, targetProtein, exerciseDay]);

    // Validation rule: Today requires at least 3 meals logged
    const canRunToday = dailyLog.length >= 3;
    const canRunAudit = period === 'today' ? canRunToday : period === 'yesterday' ? activeData.hasData : true;

    const cacheKey = useMemo(() => {
        const todayStr = new Date().toDateString();
        const histCount = (historicalDays || []).length;
        return `macrotrack_coach_${period}_${language}_${todayStr}_${activeData.log.length}_${activeData.kcal}_${histCount}_${activeData.isExercise ? 'gym' : 'rest'}`;
    }, [period, language, activeData.log.length, activeData.kcal, historicalDays, activeData.isExercise]);

    // Load from local storage cache if available
    useEffect(() => {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            try {
                setAnalysis(JSON.parse(cached));
            } catch (e) {
                console.warn('Failed to parse cached coach analysis', e);
            }
        } else {
            setAnalysis(null);
        }
    }, [cacheKey]);

    const runAnalysis = useCallback(async () => {
        if (!canRunAudit) return;

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
                return `${d.dateStr}: ${d.kcal} kcal, ${d.protein}g protein (${d.entries?.length || 0} meals)`;
            }).join('; ');

            const res = await fetch('/api/coach-analysis', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    period,
                    dailyLog: activeData.log,
                    consumedKcal: activeData.kcal,
                    consumedProtein: activeData.protein,
                    consumedCarbs: activeData.carbs,
                    consumedFat: activeData.fat,
                    targetKcal: activeData.targetKcal,
                    targetProtein: activeData.targetProtein,
                    exerciseDay: activeData.isExercise,
                    profile,
                    historicalSummary,
                    language: language || 'en'
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
                throw new Error(t.coaching.errorMessage);
            }
        } catch (err: any) {
            console.error('Coaching analysis error:', err);
            setError(err.message || t.coaching.errorMessage);
            playSound('error');
        } finally {
            setLoading(false);
        }
    }, [period, activeData, canRunAudit, profile, historicalDays, language, cacheKey, t]);

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

    const totalHistoricalMeals = useMemo(() => {
        return (historicalDays || []).slice(0, 7).reduce((sum, d) => sum + (d.entries?.length || 0), 0) + dailyLog.length;
    }, [historicalDays, dailyLog.length]);

    const subtitleText = period === 'yesterday'
        ? t.coaching.yesterdaySubtitle
        : period === 'today'
        ? t.coaching.todaySubtitle
        : t.coaching.sevenDaysSubtitle;

    return (
        <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Header & 3-Way Timeframe Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="font-drama text-3xl text-brutal-black tracking-tight">{t.coaching.title}</h2>
                    <p className="font-sans text-xs text-brutal-black/50 tracking-wide mt-0.5">
                        {subtitleText}
                    </p>
                </div>

                {/* Yesterday / Today / 7 Days Toggle */}
                <div className="bg-black/5 p-1 rounded-full border border-black/5 flex items-center gap-0.5 shadow-inner shrink-0 self-start sm:self-auto">
                    <button
                        onClick={() => setPeriod('yesterday')}
                        className={`px-3 py-1 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all ${period === 'yesterday' ? 'bg-brutal-black text-off-white shadow-sm' : 'text-brutal-black/50 hover:text-brutal-black'}`}
                    >
                        {t.coaching.yesterday}
                    </button>
                    <button
                        onClick={() => setPeriod('today')}
                        className={`px-3 py-1 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all ${period === 'today' ? 'bg-brutal-black text-off-white shadow-sm' : 'text-brutal-black/50 hover:text-brutal-black'}`}
                    >
                        {t.coaching.today}
                    </button>
                    <button
                        onClick={() => setPeriod('7d')}
                        className={`px-3 py-1 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all ${period === '7d' ? 'bg-brutal-black text-off-white shadow-sm' : 'text-brutal-black/50 hover:text-brutal-black'}`}
                    >
                        {t.coaching.sevenDays}
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-sans flex items-start gap-2 animate-in fade-in">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                    <div className="flex-1">
                        <span className="font-bold block mb-0.5">{t.coaching.errorTitle}</span>
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {/* Hero Card: Single Unified Action Hub */}
            <div className="brutal-card p-6 bg-black text-off-white border-2 border-brutal-black rounded-3xl shadow-xl flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

                {/* Subtitle / Scope Tag */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-emerald-600/30 rounded-xl text-emerald-400 border border-emerald-500/30">
                            <BrainCircuit size={18} className={loading ? "animate-spin" : "animate-pulse"} />
                        </div>
                        <div>
                            <span className="font-sans text-[9px] uppercase tracking-[0.25em] opacity-60 font-bold block">
                                {t.coaching.bannerTag}
                            </span>
                            <span className="font-sans text-xs opacity-75 flex items-center gap-1.5 font-medium">
                                {period === 'yesterday' ? (
                                    <>
                                        <Activity size={12} className="text-emerald-400" />
                                        {activeData.isExercise ? t.coaching.activityModeGym : t.coaching.activityModeRest} &middot; {activeData.log.length} {t.coaching.yesterdayMeals}
                                    </>
                                ) : period === 'today' ? (
                                    <>
                                        {activeData.isExercise ? <Flame size={12} className="text-amber-400 fill-amber-400" /> : <Activity size={12} className="text-emerald-400" />}
                                        {activeData.isExercise ? t.coaching.activityModeGym : t.coaching.activityModeRest} &middot; {dailyLog.length} {t.coaching.mealsLogged}
                                    </>
                                ) : (
                                    <>
                                        <Activity size={12} className="text-emerald-400" />
                                        {totalHistoricalMeals} {t.coaching.sevenDaysMeals}
                                    </>
                                )}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Result Grade & Verdict or Ready Callout */}
                {analysis ? (
                    <div className="flex flex-col gap-3.5 pt-1">
                        <div className="flex items-center justify-between bg-white/5 border border-white/10 p-4 rounded-2xl">
                            <div className="flex items-center gap-3.5">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-data text-2xl font-black border-2 shadow-lg ${getGradeStyle(analysis.grade)}`}>
                                    {analysis.grade}
                                </div>
                                <div>
                                    <span className="font-sans text-[10px] uppercase tracking-widest opacity-60 font-bold block">
                                        {t.coaching.overallScore}
                                    </span>
                                    <span className="font-data text-2xl font-bold text-white">
                                        {analysis.score} <span className="text-xs font-sans font-normal opacity-50">{t.coaching.scoreOutOf}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Verdict Quote */}
                        <div className="p-3.5 bg-white/10 rounded-2xl border border-white/10">
                            <p className="font-sans font-semibold text-xs text-white leading-relaxed">
                                &ldquo;{analysis.verdict}&rdquo;
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="py-2">
                        <p className="text-xs text-white/70 font-sans leading-relaxed">
                            {period === 'yesterday' && !activeData.hasData
                                ? t.coaching.noYesterdayData
                                : period === 'today' && !canRunToday
                                ? t.coaching.minMealsRequired.replace('{count}', dailyLog.length.toString())
                                : t.coaching.emptyDescription}
                        </p>
                    </div>
                )}

                {/* Single Primary Action Button with 3-meal requirement validation */}
                <div className="pt-1 flex flex-col gap-2">
                    <button
                        onClick={runAnalysis}
                        disabled={loading || !canRunAudit}
                        className={`w-full py-3.5 px-4 rounded-2xl font-sans text-xs font-bold uppercase tracking-wider transition-all active:scale-98 shadow-md flex items-center justify-center gap-2 ${
                            !canRunAudit
                                ? 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        }`}
                    >
                        {loading ? (
                            <>
                                <RefreshCw size={15} className="animate-spin" />
                                <span>{t.coaching.analyzingButton}</span>
                            </>
                        ) : !canRunAudit ? (
                            <>
                                <Lock size={15} className="text-amber-400" />
                                <span>
                                    {period === 'today'
                                        ? t.coaching.minMealsRequired.replace('{count}', dailyLog.length.toString())
                                        : period === 'yesterday'
                                        ? t.coaching.noYesterdayData
                                        : t.coaching.runButton}
                                </span>
                            </>
                        ) : analysis ? (
                            <>
                                <RefreshCw size={15} />
                                <span>{t.coaching.recalculateButton}</span>
                            </>
                        ) : (
                            <>
                                <Zap size={15} className="text-amber-400 fill-amber-400" />
                                <span>{t.coaching.runButton}</span>
                            </>
                        )}
                    </button>

                    {period === 'today' && !canRunToday && (
                        <span className="text-[10px] text-amber-300/80 font-sans text-center">
                            ⚡ {t.coaching.minMealsRequired.replace('{count}', dailyLog.length.toString())}
                        </span>
                    )}
                </div>
            </div>

            {/* Loading State Spinner when analyzing from scratch */}
            {loading && !analysis && (
                <div className="flex flex-col gap-3 py-6 items-center justify-center text-center opacity-75 animate-in fade-in">
                    <div className="w-10 h-10 rounded-full border-3 border-emerald-200 border-t-emerald-600 animate-spin" />
                    <span className="font-sans text-xs font-bold uppercase tracking-widest text-brutal-black">
                        {t.coaching.loadingTitle}
                    </span>
                    <span className="text-[11px] text-brutal-black/50 font-sans">
                        {t.coaching.loadingSubtitle}
                    </span>
                </div>
            )}

            {/* Detailed Structured Analysis Cards */}
            {analysis && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                    {/* Macro Integrity & Nutrient Timing Cards */}
                    <div className="grid grid-cols-1 gap-3">
                        {/* 1. Macro Integrity */}
                        <div className="brutal-card p-4 bg-white border-2 border-brutal-black/20 rounded-2xl flex flex-col gap-2 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="font-sans text-xs font-bold uppercase tracking-wider text-brutal-black flex items-center gap-1.5">
                                    <Activity size={14} className="text-emerald-600" />
                                    {t.coaching.macroIntegrityTitle}
                                </span>
                                {getStatusBadge(analysis.macroIntegrity.status)}
                            </div>
                            <p className="text-xs text-brutal-black/80 font-sans leading-relaxed">
                                {analysis.macroIntegrity.comment}
                            </p>
                        </div>

                        {/* 2. Nutrient Timing & Recovery */}
                        <div className="brutal-card p-4 bg-white border-2 border-brutal-black/20 rounded-2xl flex flex-col gap-2 shadow-xs">
                            <div className="flex items-center justify-between">
                                <span className="font-sans text-xs font-bold uppercase tracking-wider text-brutal-black flex items-center gap-1.5">
                                    <Zap size={14} className="text-amber-500" />
                                    {t.coaching.nutrientTimingTitle}
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
                                    {t.coaching.metabolicLeaksTitle}
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
                                                {leak.severity === 'high' ? t.coaching.highPriority : t.coaching.mediumPriority}
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

                    {/* Tactical Directives */}
                    {analysis.directives && analysis.directives.length > 0 && (
                        <div className="flex flex-col gap-2.5 pt-1">
                            <div className="flex items-center gap-1.5 px-1">
                                <CheckCircle2 size={14} className="text-emerald-600" />
                                <h3 className="font-sans text-[11px] uppercase tracking-[0.2em] font-bold opacity-60">
                                    {period === 'yesterday'
                                        ? t.coaching.directivesTitleYesterday
                                        : period === 'today'
                                        ? t.coaching.directivesTitle
                                        : t.coaching.directivesTitleWeekly}
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

export default CoachingView;
