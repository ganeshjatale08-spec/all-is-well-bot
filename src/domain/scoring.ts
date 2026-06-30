// Pure, deterministic daily health score (TRD §4: "weighted rule function
// over (calories vs target, protein %, water %, sleep %, activity %,
// symptom penalty). 100% deterministic.") — no UI/network imports, no LLM.
//
// TRD/PRD/BACKEND_SCHEMA specify the inputs to weight but not exact weights
// or curve shapes, so the breakdown below is this implementation's own
// documented choice: 100 positive points split across five components, then
// a symptom penalty subtracted. Calories and sleep use a "closeness" curve
// (penalize both under- and over-shooting the target); protein, water, and
// activity use a "progress" curve (more is fine, capped at the target).

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// 100 at/within `toleranceRatio` of target, falling linearly to 0 by
// `zeroAtRatio` away from target. Used where both shortfall and excess are
// undesirable (calories, sleep).
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

// 0-100 as actual approaches target; capped at 100 once target is met or
// exceeded. Used where more is simply better, up to the goal (protein,
// water, activity).
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
const SLEEP_TOLERANCE_RATIO = 0.0625; // ~30 min on an 8h target
const SLEEP_ZERO_AT_RATIO = 0.375; // ~3h on an 8h target

// No explicit daily step/workout goal exists yet (goal-generator is Phase
// 5); use commonly-cited baselines until per-user activity goals exist.
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
  const raw = symptomSeverities.reduce((sum, severity) => sum + severity, 0) *
    SYMPTOM_PENALTY_PER_SEVERITY;
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

// Exposes the five 0-100 sub-scores alongside the total — the Today Ring's
// four arcs (FRONTEND_DESIGN §6, UI_UX_DESIGN §3) are driven by these same
// numbers so the ring and the score can never disagree.
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

export function calculateDailyScore(input: DailyScoreInput): number {
  return calculateDailyScoreBreakdown(input).total;
}
