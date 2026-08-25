/**
 * Caloric Target Calculation
 * ─────────────────────────────────────────────────────────────────────────────
 * Formula: Mifflin-St Jeor BMR × Physical Activity Level (PAL) × Goal Modifier
 *
 * References:
 *   Mifflin, M.D. et al. (1990). "A new predictive equation for resting energy
 *   expenditure in healthy individuals." American Journal of Clinical Nutrition.
 *   https://doi.org/10.1093/ajcn/51.2.241
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STEP 1 — Basal Metabolic Rate (BMR)
 * ─────────────────────────────────────────────────────────────────────────────
 *   Male:   BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
 *   Female: BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STEP 2 — Physical Activity Level (PAL) multiplier
 * ─────────────────────────────────────────────────────────────────────────────
 *   Sedentary (desk job, no exercise)    : × 1.2
 *   Light     (daily walking ~30 min)    : × 1.375  ← LIGHT baseline
 *   Moderate  (gym 3-5×/wk)             : × 1.55   ← MODERATE baseline
 *   Active    (hard training 6-7×/wk)   : × 1.725  ← ACTIVE baseline
 *   Very Active (physical job + gym)     : × 1.9
 *
 *   The user selects one of three tiers (LIGHT / MODERATE / ACTIVE).
 *   Exercise days add a further +400 kcal / +25 g protein on top.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STEP 3 — Goal modifier (applied after PAL)
 * ─────────────────────────────────────────────────────────────────────────────
 *   SHRED (Cut)          : TDEE × 0.80  (−20% deficit)
 *   RECOMP (Maintain)    : TDEE × 1.00  (maintenance)
 *   TITAN  (Bulk)        : TDEE × 1.15  (+15% surplus)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * STEP 4 — Exercise Day Bonus (applied at runtime, not stored in profile)
 * ─────────────────────────────────────────────────────────────────────────────
 *   When user taps "Exercise Day" in the dashboard:
 *     effectiveTarget = targetKcal + EXERCISE_BONUS_KCAL (400 kcal)
 *
 *   This bonus resets each midnight with the daily log.
 *   Rationale: 400 kcal approximates a moderate 45-60 min gym session (lifting
 *   or mixed cardio) for a 70-90 kg individual.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PROTEIN target — adjusted by goal intent
 * ─────────────────────────────────────────────────────────────────────────────
 *   SHRED  : 2.2 g/kg  (slightly higher to protect muscle in a caloric deficit)
 *   RECOMP : 2.4 g/kg  (higher target for building muscle while recomping)
 *   TITAN  : 1.8 g/kg  (plenty of protein in a caloric surplus)
 *
 *   Sources: Helms et al. (2014) JISSN; Morton et al. (2017) BJSM.
 */

/**
 * Activity level options available to the user.
 * PAL = Physical Activity Level multiplier applied to BMR.
 */
export const ACTIVITY_LEVELS = [
    {
        value: 'SEDENTARY',
        label: 'Desk Life',
        description: 'Mostly sitting — little to no exercise',
        pal: 1.2,
    },
    {
        value: 'LIGHT',
        label: 'Walker',
        description: 'Regular walking, light daily activity — no formal training',
        pal: 1.375,
    },
    {
        value: 'MODERATE',
        label: 'Grinder',
        description: 'Gym or sport 3-4 times per week',
        pal: 1.55,
    },
    {
        value: 'ACTIVE',
        label: 'Beast',
        description: 'Hard training 6-7×/week or physically demanding job + gym',
        pal: 1.725,
    },
];

/** Return the PAL multiplier for a given activity level value string */
export function getPAL(activityLevel: string): number {
    return ACTIVITY_LEVELS.find(a => a.value === activityLevel)?.pal ?? 1.375;
}

/** Kcal added when user marks today as an exercise day */
export const EXERCISE_BONUS_KCAL = 400;

/**
 * Extra protein target added on exercise days.
 * Rationale: A typical resistance/cardio session increases muscle protein
 * synthesis. ~25 g extra protein covers the additional MPS stimulus
 * (approx 0.3 g/kg for an 80 kg person — Morton et al. 2017).
 */
export const EXERCISE_BONUS_PROTEIN = 25;

interface CalibrateInput {
    weight: number;        // kg
    height: number;        // cm
    age: number;           // years
    gender: string;        // 'MALE' | 'FEMALE'
    goal: string;          // 'SHRED...' | 'RECOMP...' | 'TITAN...'
    activityLevel: string; // 'LIGHT' | 'MODERATE' | 'ACTIVE'
}

interface CalibrateResult {
    targetKcal: number;
    targetProtein: number;
}

/**
 * Calculate daily kcal and protein targets using Mifflin-St Jeor + PAL.
 */
export function calculateTargets({ weight, height, age, gender, goal, activityLevel }: CalibrateInput): CalibrateResult {
    // Step 1: BMR
    const bmr = gender === 'MALE'
        ? (10 * weight) + (6.25 * height) - (5 * age) + 5
        : (10 * weight) + (6.25 * height) - (5 * age) - 161;

    // Step 2: TDEE using selected activity PAL
    const tdee = bmr * getPAL(activityLevel);

    // Step 3: Goal modifier
    let kcalModifier = 1.0;    // RECOMP default
    let proteinPerKg = 2.4;    // RECOMP: higher target for building muscle while recomping

    if (goal.includes('SHRED')) {
        kcalModifier = 0.80;
        proteinPerKg = 2.2;    // Slightly higher to protect muscle in a caloric deficit
    } else if (goal.includes('TITAN')) {
        kcalModifier = 1.15;
        proteinPerKg = 1.8;    // Caloric surplus handles energy demands
    }

    return {
        targetKcal: Math.round(tdee * kcalModifier),
        targetProtein: Math.round(weight * proteinPerKg),
    };
}

export interface WeeklyTelemetryInput {
    weight: number;
    height: number;
    age: number;
    gender: string;
    activityLevel: string;
    weeklyConsumedKcal: number;
    exerciseDaysCount: number;
    smartwatchBurnKcal?: number | null;
}

export interface WeeklyTelemetryResult {
    dailyMaintenanceTDEE: number;
    weeklyMaintenanceTDEE: number;
    totalWeeklyBurn: number;
    weeklyConsumedKcal: number;
    netDeficitKcal: number;
    isDeficit: boolean;
    fatGrams: number;
    isSmartwatchOverride: boolean;
}

/**
 * Calculate weekly energy balance, deficit/surplus, and estimated fat loss/gain in grams.
 * 7.7 kcal deficit = approx. 1 g of body fat tissue (Helms et al. / Hall et al.).
 */
export function calculateWeeklyDeficitTelemetry({
    weight,
    height,
    age,
    gender,
    activityLevel,
    weeklyConsumedKcal,
    exerciseDaysCount,
    smartwatchBurnKcal,
}: WeeklyTelemetryInput): WeeklyTelemetryResult {
    // 1. Calculate Mifflin-St Jeor BMR
    const bmr = gender === 'MALE'
        ? (10 * weight) + (6.25 * height) - (5 * age) + 5
        : (10 * weight) + (6.25 * height) - (5 * age) - 161;

    // 2. Base Daily TDEE (Maintenance)
    const dailyMaintenanceTDEE = Math.round(bmr * getPAL(activityLevel));

    // 3. Weekly Maintenance (7 days baseline + exercise days bonus)
    const calculatedWeeklyBurn = (dailyMaintenanceTDEE * 7) + (exerciseDaysCount * EXERCISE_BONUS_KCAL);

    // 4. Effective Weekly Burn (Smartwatch or Model)
    const isSmartwatchOverride = typeof smartwatchBurnKcal === 'number' && smartwatchBurnKcal > 0;
    const totalWeeklyBurn = isSmartwatchOverride ? smartwatchBurnKcal : calculatedWeeklyBurn;

    // 5. Net Deficit: Positive = Deficit (burned > eaten), Negative = Surplus (eaten > burned)
    const netDeficitKcal = totalWeeklyBurn - weeklyConsumedKcal;
    const isDeficit = netDeficitKcal >= 0;

    // 6. Fat grams (7.7 kcal per 1g fat)
    const fatGrams = Math.round(Math.abs(netDeficitKcal) / 7.7);

    return {
        dailyMaintenanceTDEE,
        weeklyMaintenanceTDEE: calculatedWeeklyBurn,
        totalWeeklyBurn,
        weeklyConsumedKcal,
        netDeficitKcal,
        isDeficit,
        fatGrams,
        isSmartwatchOverride,
    };
}
