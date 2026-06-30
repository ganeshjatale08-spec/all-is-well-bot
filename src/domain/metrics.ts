import type { ACTIVITY_OPTIONS, GOAL_OPTIONS, SEX_OPTIONS } from '../constants/enums';

// Pure, deterministic health math (TRD §4, §12) — no UI/network imports.
// The LLM never computes these; it only narrates them.

export type Sex = (typeof SEX_OPTIONS)[number];
export type ActivityLevel = (typeof ACTIVITY_OPTIONS)[number];
export type Goal = (typeof GOAL_OPTIONS)[number];

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

const BMI_UNDERWEIGHT_MAX = 18.5;
const BMI_NORMAL_MAX = 25;
const BMI_OVERWEIGHT_MAX = 30;

export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export type DailyTargets = {
  calorieTargetKcal: number;
  proteinTargetG: number;
  waterTargetL: number;
  sleepTargetHours: number;
};

export type IdealWeightRange = {
  minKg: number;
  maxKg: number;
};

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function categorizeBmi(bmi: number): BmiCategory {
  if (bmi < BMI_UNDERWEIGHT_MAX) return 'underweight';
  if (bmi < BMI_NORMAL_MAX) return 'normal';
  if (bmi < BMI_OVERWEIGHT_MAX) return 'overweight';
  return 'obese';
}

export function calculateBmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  // Mifflin-St Jeor: +5 (male) / -161 (female). No sex-specific constant is
  // published for 'other'; we use the midpoint of the two so the estimate
  // isn't skewed toward either formula.
  if (sex === 'male') return base + 5;
  if (sex === 'female') return base - 161;
  return base + (5 + -161) / 2;
}

export function calculateTdee(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_FACTOR[activityLevel];
}

export function calculateIdealWeightRange(heightCm: number): IdealWeightRange {
  const heightM = heightCm / 100;
  return {
    minKg: BMI_UNDERWEIGHT_MAX * heightM * heightM,
    maxKg: BMI_NORMAL_MAX * heightM * heightM,
  };
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
