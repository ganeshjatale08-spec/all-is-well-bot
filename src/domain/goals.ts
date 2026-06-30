// Pure, deterministic next-month goal targets (PRD §7: "target weight, daily
// step goal, sleep goal, water goal, protein goal, workout goal... numeric
// goals are formula-derived" — TRD §4.2: "the LLM frames and prioritizes
// them"). No UI/network imports; the LLM only ever receives these already-
// computed numbers to write a one-line rationale per goal, never to derive
// them (HARD RULE 2).
import {
  calculateProteinTargetG,
  calculateSleepTargetHours,
  calculateWaterTargetL,
  type ActivityLevel,
  type Goal,
} from './metrics';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Conservative, sustainable monthly pace (HARD RULE 6: no extreme-deficit
// advice) — roughly the "0.5-1% of body weight per week" guidance most
// nutrition sources cite, rounded to a flat monthly figure since this runs
// once a month, not weekly.
const SAFE_MONTHLY_WEIGHT_LOSS_KG = 2;
const SAFE_MONTHLY_WEIGHT_GAIN_KG = 1.5;

// `targetWeightKg` is the user's own stated aspiration (profiles/onboarding);
// this only ever steps toward it by a safe monthly increment, never sets a
// target the user didn't ask for, and never overshoots it.
export function calculateMonthlyTargetWeightKg(
  goal: Goal,
  currentWeightKg: number,
  targetWeightKg: number | null,
): number | null {
  if (targetWeightKg === null) return null;
  if (goal === 'weight_loss') {
    return Math.max(currentWeightKg - SAFE_MONTHLY_WEIGHT_LOSS_KG, targetWeightKg);
  }
  if (goal === 'weight_gain' || goal === 'muscle_gain') {
    return Math.min(currentWeightKg + SAFE_MONTHLY_WEIGHT_GAIN_KG, targetWeightKg);
  }
  return targetWeightKg;
}

const DEFAULT_STEPS_GOAL = 8000;
const STEPS_GOAL_FLOOR = 6000;
const STEPS_GOAL_CEILING = 15000;
const STEPS_PROGRESSION_FACTOR = 1.1;
const STEPS_ROUNDING = 500;

// Progresses from last month's actual average rather than resetting to the
// same baseline every month, so an already-active user gets a real stretch
// goal instead of a goal below where they already are.
export function calculateDailyStepGoal(avgStepsLastMonth: number | null): number {
  if (avgStepsLastMonth === null || avgStepsLastMonth <= 0) return DEFAULT_STEPS_GOAL;
  const progressed = avgStepsLastMonth * STEPS_PROGRESSION_FACTOR;
  const rounded = Math.round(progressed / STEPS_ROUNDING) * STEPS_ROUNDING;
  return clamp(rounded, STEPS_GOAL_FLOOR, STEPS_GOAL_CEILING);
}

const WORKOUT_BASELINE_BY_ACTIVITY: Record<ActivityLevel, number> = {
  sedentary: 2,
  lightly_active: 3,
  moderately_active: 4,
  very_active: 5,
};
const WORKOUT_GOAL_CEILING = 6;

export function calculateWorkoutGoalPerWeek(
  activityLevel: ActivityLevel,
  avgWorkoutsPerWeekLastMonth: number | null,
): number {
  const baseline = WORKOUT_BASELINE_BY_ACTIVITY[activityLevel];
  if (avgWorkoutsPerWeekLastMonth === null) return baseline;
  const matchedPace = Math.round(Math.max(avgWorkoutsPerWeekLastMonth, baseline));
  const stretch = avgWorkoutsPerWeekLastMonth >= baseline ? 1 : 0;
  return Math.min(matchedPace + stretch, WORKOUT_GOAL_CEILING);
}

export type MonthlyGoalInput = {
  weightKg: number;
  age: number;
  goal: Goal;
  activityLevel: ActivityLevel;
  targetWeightKg: number | null;
  avgStepsLastMonth: number | null;
  avgWorkoutsPerWeekLastMonth: number | null;
};

export type MonthlyGoalTargets = {
  targetWeightKg: number | null;
  dailyStepGoal: number;
  sleepGoalHours: number;
  waterGoalL: number;
  proteinGoalG: number;
  workoutGoalPerWeek: number;
};

export function calculateMonthlyGoals(input: MonthlyGoalInput): MonthlyGoalTargets {
  return {
    targetWeightKg: calculateMonthlyTargetWeightKg(input.goal, input.weightKg, input.targetWeightKg),
    dailyStepGoal: calculateDailyStepGoal(input.avgStepsLastMonth),
    sleepGoalHours: calculateSleepTargetHours(input.age),
    waterGoalL: calculateWaterTargetL(input.weightKg),
    proteinGoalG: Math.round(calculateProteinTargetG(input.weightKg, input.goal)),
    workoutGoalPerWeek: calculateWorkoutGoalPerWeek(input.activityLevel, input.avgWorkoutsPerWeekLastMonth),
  };
}
