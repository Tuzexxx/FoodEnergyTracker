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
 *   SHRED  : 2.0 g/kg  (slightly higher to protect muscle in a caloric deficit)
 *   RECOMP : 1.8 g/kg  (sweet spot for building muscle while burning fat)
 *   TITAN  : 1.6 g/kg  (plenty of protein; caloric surplus handles energy demands)
 *
 *   Sources: Helms et al. (2014) JISSN; Morton et al. (2017) BJSM.
 */

/**
 * Activity level options available to the user.
 * PAL = Physical Activity Level multiplier applied to BMR.
 */
export const ACTIVITY_LEVELS = [
    {
        value: 'LIGHT',
        label: 'Daily Walker',
        description: 'Desk job or light work, some walking — no formal training',
        pal: 1.375,
    },
    {
        value: 'MODERATE',
        label: 'Gym 3× / week',
        description: 'Regular gym or sport sessions 3-4 times per week',
        pal: 1.55,
    },
    {
        value: 'ACTIVE',
        label: 'Gym Freak',
        description: 'Hard training 6-7×/week or a physically demanding job + gym',
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
    let proteinPerKg = 1.8;    // RECOMP: sweet spot for building muscle while burning fat

    if (goal.includes('SHRED')) {
        kcalModifier = 0.80;
        proteinPerKg = 2.0;    // Slightly higher to protect muscle in a caloric deficit
    } else if (goal.includes('TITAN')) {
        kcalModifier = 1.15;
        proteinPerKg = 1.6;    // Caloric surplus handles energy demands
    }

    return {
        targetKcal: Math.round(tdee * kcalModifier),
        targetProtein: Math.round(weight * proteinPerKg),
    };
}
