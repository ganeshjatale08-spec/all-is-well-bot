// Mirror of src/domain/{metrics,nutrition,scoring}.ts for the Deno Edge
// Function runtime (HARD RULE 2: the LLM never does arithmetic — Edge
// Functions recompute the same deterministic numbers server-side before
// prompting Gemini). Mirrored rather than imported because Metro (RN) and
// Deno resolve relative/extension-less TS imports differently — the same
// "mirror, don't import" approach CLAUDE.md already prescribes for zod
// schemas shared between the client and Edge Function I/O.
//
// KEEP IN SYNC with src/domain/metrics.ts, src/domain/nutrition.ts,
// src/domain/scoring.ts. Any change to weights/targets/formulas there must
// be copied here too.

// ---- metrics.ts ----

export type Sex = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';
export type Goal =
  | 'weight_loss'
  | 'weight_gain'
  | 'muscle_gain'
  | 'improve_sleep'
  | 'stress_reduction'
  | 'diabetes_management'
  | 'general_fitness';

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
};

const CALORIE_FLOOR = 1200;

const CALORIE_ADJUSTMENT_BY_GOAL: Record<Goal, number> = {
  weight_loss: -500,
  weight_gain: 500,
  muscle_gain: 300,
  improve_sleep: 0,
  stress_reduction: 0,
  diabetes_management: 0,
  general_fitness: 0,
};

const PROTEIN_G_PER_KG_BY_GOAL: Record<Goal, number> = {
  muscle_gain: 1.8,
  weight_loss: 1.6,
  weight_gain: 1.6,
  improve_sleep: 1.0,
  stress_reduction: 1.0,
  diabetes_management: 1.0,
  general_fitness: 1.0,
};

const WATER_ML_PER_KG = 35;
const WATER_FLOOR_L = 2.0;

export type DailyTargets = {
  calorieTargetKcal: number;
  proteinTargetG: number;
  waterTargetL: number;
  sleepTargetHours: number;
};

export function calculateBmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === 'male') return base + 5;
  if (sex === 'female') return base - 161;
  return base + (5 + -161) / 2;
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_FACTOR[activityLevel];
}

export function calculateCalorieTarget(tdee: number, goal: Goal): number {
  return Math.max(CALORIE_FLOOR, tdee + CALORIE_ADJUSTMENT_BY_GOAL[goal]);
}

export function calculateProteinTargetG(weightKg: number, goal: Goal): number {
  return weightKg * PROTEIN_G_PER_KG_BY_GOAL[goal];
}

export function calculateWaterTargetL(weightKg: number): number {
  return Math.max(WATER_FLOOR_L, (weightKg * WATER_ML_PER_KG) / 1000);
}

export function calculateSleepTargetHours(age: number): number {
  if (age < 18) return 9;
  if (age < 65) return 8;
  return 7.5;
}

export type TargetsInput = {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  activityLevel: ActivityLevel;
  goal: Goal;
};

export function calculateDailyTargets(input: TargetsInput): DailyTargets {
  const bmr = calculateBmr(input.sex, input.weightKg, input.heightCm, input.age);
  const tdee = calculateTdee(bmr, input.activityLevel);

  return {
    calorieTargetKcal: calculateCalorieTarget(tdee, input.goal),
    proteinTargetG: calculateProteinTargetG(input.weightKg, input.goal),
    waterTargetL: calculateWaterTargetL(input.weightKg),
    sleepTargetHours: calculateSleepTargetHours(input.age),
  };
}

// ---- nutrition.ts ----

export type FoodEntryMacros = {
  servings: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type MacroTotals = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

const EMPTY_TOTALS: MacroTotals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

export function sumMacros(entries: readonly FoodEntryMacros[]): MacroTotals {
  return entries.reduce(
    (totals, entry) => ({
      kcal: totals.kcal + entry.kcal * entry.servings,
      proteinG: totals.proteinG + entry.proteinG * entry.servings,
      carbsG: totals.carbsG + entry.carbsG * entry.servings,
      fatG: totals.fatG + entry.fatG * entry.servings,
    }),
    EMPTY_TOTALS,
  );
}

// ---- scoring.ts ----

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function closenessScore(
  actual: number,
  target: number,
  toleranceRatio: number,
  zeroAtRatio: number,
): number {
  if (target <= 0) return 100;
  const diffRatio = Math.abs(actual - target) / target;
  if (diffRatio <= toleranceRatio) return 100;
  if (diffRatio >= zeroAtRatio) return 0;
  return 100 * (1 - (diffRatio - toleranceRatio) / (zeroAtRatio - toleranceRatio));
}

function progressScore(actual: number, target: number): number {
  if (target <= 0) return 100;
  return clamp((actual / target) * 100, 0, 100);
}

const CALORIE_WEIGHT = 25;
const PROTEIN_WEIGHT = 20;
const WATER_WEIGHT = 15;
const SLEEP_WEIGHT = 20;
const ACTIVITY_WEIGHT = 20;

const CALORIE_TOLERANCE_RATIO = 0.1;
const CALORIE_ZERO_AT_RATIO = 0.5;
const SLEEP_TOLERANCE_RATIO = 0.0625;
const SLEEP_ZERO_AT_RATIO = 0.375;

const DEFAULT_STEPS_TARGET = 8000;
const DEFAULT_WORKOUT_MINUTES_TARGET = 30;

const SYMPTOM_PENALTY_PER_SEVERITY = 2;
const SYMPTOM_PENALTY_CAP = 30;

export type DailyScoreInput = {
  actualCalorieKcal: number;
  calorieTargetKcal: number;
  actualProteinG: number;
  proteinTargetG: number;
  actualWaterL: number;
  waterTargetL: number;
  actualSleepHours: number;
  sleepTargetHours: number;
  steps: number;
  workoutMinutes: number;
  symptomSeverities: readonly number[];
  stepsTarget?: number;
  workoutMinutesTarget?: number;
};

export function calculateSymptomPenalty(symptomSeverities: readonly number[]): number {
  const raw =
    symptomSeverities.reduce((sum, severity) => sum + severity, 0) * SYMPTOM_PENALTY_PER_SEVERITY;
  return clamp(raw, 0, SYMPTOM_PENALTY_CAP);
}

export type DailyScoreBreakdown = {
  calorieScore: number;
  proteinScore: number;
  waterScore: number;
  sleepScore: number;
  activityScore: number;
  symptomPenalty: number;
  total: number;
};

export function calculateDailyScoreBreakdown(input: DailyScoreInput): DailyScoreBreakdown {
  const calorieScore = closenessScore(
    input.actualCalorieKcal,
    input.calorieTargetKcal,
    CALORIE_TOLERANCE_RATIO,
    CALORIE_ZERO_AT_RATIO,
  );
  const proteinScore = progressScore(input.actualProteinG, input.proteinTargetG);
  const waterScore = progressScore(input.actualWaterL, input.waterTargetL);
  const sleepScore = closenessScore(
    input.actualSleepHours,
    input.sleepTargetHours,
    SLEEP_TOLERANCE_RATIO,
    SLEEP_ZERO_AT_RATIO,
  );
  const activityScore = Math.max(
    progressScore(input.steps, input.stepsTarget ?? DEFAULT_STEPS_TARGET),
    progressScore(input.workoutMinutes, input.workoutMinutesTarget ?? DEFAULT_WORKOUT_MINUTES_TARGET),
  );

  const weightedTotal =
    (calorieScore * CALORIE_WEIGHT +
      proteinScore * PROTEIN_WEIGHT +
      waterScore * WATER_WEIGHT +
      sleepScore * SLEEP_WEIGHT +
      activityScore * ACTIVITY_WEIGHT) /
    100;

  const symptomPenalty = calculateSymptomPenalty(input.symptomSeverities);
  const total = Math.round(clamp(weightedTotal - symptomPenalty, 0, 100));

  return { calorieScore, proteinScore, waterScore, sleepScore, activityScore, symptomPenalty, total };
}
