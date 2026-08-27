import { useState } from 'react';
import { Watch, RotateCcw, TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useCompletedDaysTelemetry } from './WeeklyFatBurnModal';

const ProgressView = () => {
    const [period, setPeriod] = useState<'7d' | '30d'>('7d');
    const { daysCount, consumedKcal, exerciseDaysCount, dateRangeLabel, telemetry } = useCompletedDaysTelemetry(period);
    const {
        smartwatchWeeklyBurn,
        setSmartwatchWeeklyBurn,
        smartwatchMonthlyBurn,
        setSmartwatchMonthlyBurn,
        profile,
    } = useStore();

    const currentWatchBurn = period === '7d' ? smartwatchWeeklyBurn : smartwatchMonthlyBurn;
    const [smartwatchInput, setSmartwatchInput] = useState(currentWatchBurn ? currentWatchBurn.toString() : '');

    const handleSaveWatch = () => {
        const val = Number(smartwatchInput.trim());
        if (val && val > 0) {
            if (period === '7d') setSmartwatchWeeklyBurn(val);
            else setSmartwatchMonthlyBurn(val);
        } else {
            if (period === '7d') setSmartwatchWeeklyBurn(null);
            else setSmartwatchMonthlyBurn(null);
        }
    };

    const handleResetWatch = () => {
        if (period === '7d') setSmartwatchWeeklyBurn(null);
        else setSmartwatchMonthlyBurn(null);
        setSmartwatchInput('');
    };

    const dailyAvgIntake = telemetry ? Math.round(consumedKcal / daysCount) : 0;
    const dailyAvgBurn = telemetry ? Math.round(telemetry.totalWeeklyBurn / daysCount) : 0;

    if (!telemetry || !profile) {
        return (
            <div className="w-full flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl border border-black/5 shadow-sm">
                <Activity size={32} className="text-orange-500 animate-pulse mb-3" />
                <h3 className="font-drama text-2xl mb-1">Calibrating Progress...</h3>
                <p className="font-sans text-xs opacity-50">Log at least one completed day to view your deficit & fat burn telemetry.</p>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300">
            {/* Header & Period Switcher */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-drama text-3xl text-brutal-black tracking-tight">Fat Burn & Deficit</h2>
                    <p className="font-sans text-xs text-brutal-black/50 tracking-wide mt-0.5">{dateRangeLabel}</p>
                </div>

                {/* 7d / 30d Toggle */}
                <div className="bg-black/5 p-1 rounded-full border border-black/5 flex items-center gap-1 shadow-inner shrink-0">
                    <button
                        onClick={() => {
                            setPeriod('7d');
                            setSmartwatchInput(smartwatchWeeklyBurn ? smartwatchWeeklyBurn.toString() : '');
                        }}
                        className={`px-3.5 py-1 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all ${period === '7d' ? 'bg-brutal-black text-off-white shadow-sm' : 'text-brutal-black/50 hover:text-brutal-black'}`}
                    >
                        7 Days
                    </button>
                    <button
                        onClick={() => {
                            setPeriod('30d');
                            setSmartwatchInput(smartwatchMonthlyBurn ? smartwatchMonthlyBurn.toString() : '');
                        }}
                        className={`px-3.5 py-1 rounded-full font-sans text-xs font-bold uppercase tracking-wider transition-all ${period === '30d' ? 'bg-brutal-black text-off-white shadow-sm' : 'text-brutal-black/50 hover:text-brutal-black'}`}
                    >
                        30 Days
                    </button>
                </div>
            </div>

            {/* Hero Card: Primary Fat Burn Grams */}
            <div className={`p-6 sm:p-8 rounded-3xl border-2 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden transition-all duration-500 ${
                telemetry.isDeficit 
                    ? 'bg-gradient-to-b from-orange-500 to-amber-600 text-white border-orange-600 shadow-orange-500/20' 
                    : 'bg-gradient-to-b from-red-600 to-rose-700 text-white border-red-700 shadow-red-500/20'
            }`}>
                <div className="flex items-center gap-2 mb-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-sans font-bold uppercase tracking-widest">
                    {telemetry.isDeficit ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    <span>{telemetry.isDeficit ? 'True Caloric Deficit' : 'Caloric Surplus'}</span>
                </div>

                <div className="flex items-baseline gap-1 my-2">
                    <span className="font-drama text-6xl sm:text-7xl font-bold tracking-tighter leading-none">
                        {telemetry.isDeficit ? `-${telemetry.fatGrams}` : `+${telemetry.fatGrams}`}
                    </span>
                    <span className="font-sans text-2xl font-bold opacity-80">g</span>
                </div>

                <span className="font-sans text-xs uppercase font-bold tracking-widest opacity-90">
                    {telemetry.isDeficit ? 'Pure Fat Mass Burned' : 'Estimated Fat Stored'}
                </span>

                <div className="mt-4 pt-3 border-t border-white/20 w-full flex justify-around text-center text-xs">
                    <div>
                        <span className="opacity-60 block text-[10px] uppercase font-bold">Net Energy</span>
                        <strong className="font-data text-base font-bold">{telemetry.netDeficitKcal > 0 ? `-${telemetry.netDeficitKcal}` : `+${Math.abs(telemetry.netDeficitKcal)}`} kcal</strong>
                    </div>
                    <div className="w-[1px] bg-white/20" />
                    <div>
                        <span className="opacity-60 block text-[10px] uppercase font-bold">Gym Days</span>
                        <strong className="font-data text-base font-bold">{exerciseDaysCount} / {daysCount}</strong>
                    </div>
                </div>
            </div>

            {/* Telemetry Breakdown Grid */}
            <div className="grid grid-cols-2 gap-3 w-full">
                <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-sm flex flex-col justify-between">
                    <span className="font-sans text-[10px] uppercase font-bold text-brutal-black/50 tracking-wider">Total Consumed</span>
                    <div className="flex items-baseline gap-1 mt-2">
                        <span className="font-data text-2xl font-bold text-brutal-black">{consumedKcal}</span>
                        <span className="text-[10px] uppercase font-semibold text-brutal-black/40 font-sans">kcal</span>
                    </div>
                    <span className="font-sans text-[10px] text-brutal-black/40 mt-1">Avg {dailyAvgIntake} kcal/day</span>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-black/5 shadow-sm flex flex-col justify-between">
                    <span className="font-sans text-[10px] uppercase font-bold text-brutal-black/50 tracking-wider">Total Burned</span>
                    <div className="flex items-baseline gap-1 mt-2">
                        <span className="font-data text-2xl font-bold text-orange-600">{telemetry.totalWeeklyBurn}</span>
                        <span className="text-[10px] uppercase font-semibold text-brutal-black/40 font-sans">kcal</span>
                    </div>
                    <span className="font-sans text-[10px] text-brutal-black/40 mt-1">Avg {dailyAvgBurn} kcal/day</span>
                </div>
            </div>

            {/* Smartwatch Refinement Card */}
            <div className="p-5 rounded-3xl bg-white border border-black/5 shadow-sm flex flex-col gap-3">
                <div className="flex items-center gap-2 text-brutal-black/80 font-sans font-bold text-xs uppercase tracking-wider">
                    <Watch size={16} className="text-orange-500" />
                    <span>Smartwatch Sync Refinement ({period === '7d' ? '7-Day' : '30-Day'})</span>
                </div>
                <p className="font-sans text-xs text-brutal-black/60 leading-relaxed">
                    Enter the total active + resting burn from Apple Watch or Garmin for this period to calibrate your true biological deficit.
                </p>

                <div className="flex items-center gap-2 mt-1">
                    <input
                        type="number"
                        placeholder={telemetry.totalWeeklyBurn.toString()}
                        value={smartwatchInput}
                        onChange={(e) => setSmartwatchInput(e.target.value)}
                        className="flex-1 bg-black/5 text-brutal-black px-4 py-2.5 rounded-2xl font-data font-bold text-sm outline-none focus:bg-white focus:ring-2 focus:ring-orange-400/50 border border-transparent transition-all"
                    />
                    <button
                        onClick={handleSaveWatch}
                        className="px-4 py-2.5 bg-brutal-black text-off-white hover:bg-brutal-black/90 active:scale-95 transition-all rounded-2xl font-sans font-bold text-xs uppercase tracking-wider shadow-sm"
                    >
                        Apply
                    </button>
                    {(period === '7d' ? smartwatchWeeklyBurn : smartwatchMonthlyBurn) && (
                        <button
                            onClick={handleResetWatch}
                            className="p-2.5 bg-black/5 hover:bg-black/10 text-brutal-black/60 rounded-2xl active:scale-95 transition-all"
                            title="Reset to formula default"
                        >
                            <RotateCcw size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProgressView;
