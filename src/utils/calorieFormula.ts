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
 *   Light     (daily walking ~30 min)    : × 1.375  ← BASELINE USED HERE
 *   Moderate  (gym 3-5×/wk)             : × 1.55
 *   Active    (hard training 6-7×/wk)   : × 1.725
 *   Very Active (physical job + gym)     : × 1.9
 *
 *   We use 1.375 (Light) as the no-exercise baseline.
 *   Exercise days are handled separately via the +EXERCISE_BONUS_KCAL button.
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
 * PROTEIN target (Lemon, 2000 — sports nutrition guidelines)
 * ─────────────────────────────────────────────────────────────────────────────
 *   SHRED  : 2.0 g/kg  (preserve muscle while in deficit)
 *   RECOMP : 1.8 g/kg  (muscle maintenance/light growth)
 *   TITAN  : 1.6 g/kg  (sufficient for hypertrophy in surplus)
 */

/** Baseline PAL (Light activity: daily walking only, no formal exercise) */
const BASELINE_PAL = 1.375;

/** Kcal added when user marks today as an exercise day */
export const EXERCISE_BONUS_KCAL = 400;

interface CalibrateInput {
    weight: number; // kg
    height: number; // cm
    age: number;    // years
    gender: string; // 'MALE' | 'FEMALE'
    goal: string;   // 'SHRED...' | 'RECOMP...' | 'TITAN...'
}

interface CalibrateResult {
    targetKcal: number;
    targetProtein: number;
}

/**
 * Calculate daily kcal and protein targets using Mifflin-St Jeor + PAL.
 */
export function calculateTargets({ weight, height, age, gender, goal }: CalibrateInput): CalibrateResult {
    // Step 1: BMR
    const bmr = gender === 'MALE'
        ? (10 * weight) + (6.25 * height) - (5 * age) + 5
        : (10 * weight) + (6.25 * height) - (5 * age) - 161;

    // Step 2: TDEE at light activity baseline
    const tdee = bmr * BASELINE_PAL;

    // Step 3: Goal modifier
    let kcalModifier = 1.0;    // RECOMP default
    let proteinPerKg = 1.8;

    if (goal.includes('SHRED')) {
        kcalModifier = 0.80;
        proteinPerKg = 2.0;
    } else if (goal.includes('TITAN')) {
        kcalModifier = 1.15;
        proteinPerKg = 1.6;
    }

    return {
        targetKcal: Math.round(tdee * kcalModifier),
        targetProtein: Math.round(weight * proteinPerKg),
    };
}
