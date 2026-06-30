// Prompt assembly for daily-analysis (TRD §5). The system prompt is static
// text (no per-user values) so it stays byte-identical across calls and
// benefits from Gemini's implicit prefix caching (see gemini.ts). All
// per-user values — profile + today's numbers — go in the user prompt,
// already computed by domain.ts; the model is told explicitly not to
// recompute them (HARD RULE 2).
import type { Sex, ActivityLevel, Goal, MonthlyGoalTargets } from './domain.ts';
import type { WeeklyFacts, MonthlyFacts } from './reportAggregation.ts';

export const DAILY_ANALYSIS_SYSTEM_PROMPT = `You are Saathi, a supportive health-tracking coach for users in India.

Voice: warm, brief, encouraging, never clinical or preachy.

Rules you must always follow:
- Use only the numbers given to you. Never calculate or restate a different number than what's provided.
- Never diagnose a condition, never suggest a medication, dose, or supplement amount, and never contradict a doctor's advice.
- If the user's log includes a flagged symptom, your recommendation must clearly tell them to see a doctor, and you must not minimize or reassure away the symptom.
- Never suggest skipping meals, fasting, or extreme calorie deficits. Be supportive of any body, any pace of progress.
- If you have nothing useful or safe to say about a symptom, focus the response on the rest of the day's log instead.
- This app is not a medical device. Keep that framing implicit in tone, not as a disclaimer in every field.

Output strictly the requested JSON fields: a short headline, a 2-3 sentence insight, one concrete recommendation, and one line for tomorrow's focus.`;

export type DailyPromptProfile = {
  age: number;
  sex: Sex;
  dietType: string | null;
  primaryGoal: Goal;
  activityLevel: ActivityLevel;
};

export type DailyPromptTargets = {
  calorieTargetKcal: number;
  proteinTargetG: number;
  waterTargetL: number;
  sleepTargetHours: number;
};

export type DailyPromptToday = {
  kcal: number;
  proteinG: number;
  waterL: number;
  sleepHours: number | null;
  steps: number;
  workoutMinutes: number;
  mood: string | null;
  symptoms: readonly { symptom: string; severity: number | null }[];
};

export type DailyPromptInput = {
  profile: DailyPromptProfile;
  targets: DailyPromptTargets;
  today: DailyPromptToday;
  scoreTotal: number;
  hasRedFlagSymptom: boolean;
};

export function buildDailyUserPrompt(input: DailyPromptInput): string {
  const { profile, targets, today, scoreTotal, hasRedFlagSymptom } = input;

  const symptomLines =
    today.symptoms.length > 0
      ? today.symptoms.map((s) => `- ${s.symptom} (severity ${s.severity ?? 'unspecified'}/10)`).join('\n')
      : '- none logged';

  return `User profile: ${profile.age} years old, ${profile.sex}, diet: ${profile.dietType ?? 'unspecified'}, goal: ${profile.primaryGoal}, activity level: ${profile.activityLevel}.

Today's targets: ${Math.round(targets.calorieTargetKcal)} kcal, ${Math.round(targets.proteinTargetG)}g protein, ${targets.waterTargetL.toFixed(1)}L water, ${targets.sleepTargetHours}h sleep.

Today's actuals: ${Math.round(today.kcal)} kcal, ${Math.round(today.proteinG)}g protein, ${today.waterL.toFixed(1)}L water, ${today.sleepHours ?? 'not logged'} hours sleep, ${today.steps} steps, ${today.workoutMinutes} workout minutes, mood: ${today.mood ?? 'not logged'}.

Today's deterministic score (already computed, do not recalculate): ${scoreTotal}/100.

Symptoms logged today:
${symptomLines}
${hasRedFlagSymptom ? '\nNote: one of these symptoms is flagged as potentially serious. Your recommendation must advise seeing a doctor and must not reassure the user that it is nothing to worry about.' : ''}`;
}

// ---- weekly-report ----

export const WEEKLY_REPORT_SYSTEM_PROMPT = `You are Saathi, a supportive health-tracking coach for users in India, writing a weekly progress report.

Voice: warm, brief, encouraging, never clinical or preachy.

Rules you must always follow:
- Use only the facts given to you. Never invent or restate a different number than what's provided.
- Choose achievements and improvement areas only from the facts given — do not speculate about anything not in the data.
- Never diagnose a condition, never suggest a medication, dose, or supplement amount.
- Never suggest skipping meals, fasting, or extreme calorie deficits. Be supportive of any body, any pace of progress.
- This app is not a medical device. Keep that framing implicit in tone, not as a disclaimer in every field.

Output strictly the requested JSON fields: a 2-3 sentence narrative summarizing the week, 1-3 achievement strings, and 0-2 improvement-area strings (omit improvement areas if the week was strong across the board).`;

export function buildWeeklyUserPrompt(facts: WeeklyFacts): string {
  return `This user's week: ${facts.periodStart} to ${facts.periodEnd}, ${facts.daysLogged} day(s) logged.

Weekly score (already computed, do not recalculate): ${facts.weeklyScore}/100.

Totals: ${facts.totals.steps} steps, ${facts.totals.workoutCount} workout session(s) totaling ${facts.totals.workoutMinutes} minutes, ${facts.totals.sleepAvgHours}h average sleep, ${facts.totals.waterAvgL}L average water, ${facts.totals.proteinAvgG}g average protein.

Target hit-rate (% of logged days the component scored 80+): calories ${facts.hitRates.calorie}%, protein ${facts.hitRates.protein}%, water ${facts.hitRates.water}%, sleep ${facts.hitRates.sleep}%, activity ${facts.hitRates.activity}%.

Best day: ${facts.bestDay ? `${facts.bestDay.date} (score ${facts.bestDay.score})` : 'none'}. Worst day: ${facts.worstDay ? `${facts.worstDay.date} (score ${facts.worstDay.score})` : 'none'}.

Days with a symptom logged: ${facts.symptomDays}.`;
}

// ---- monthly-report ----

export const MONTHLY_REPORT_SYSTEM_PROMPT = `You are Saathi, a supportive health-tracking coach for users in India, writing a monthly progress report.

Voice: warm, brief, encouraging, never clinical or preachy.

Rules you must always follow:
- Use only the facts given to you. Never invent or restate a different number than what's provided, including the weight figures.
- Never diagnose a condition, never suggest a medication, dose, or supplement amount.
- Never frame any weight change as urgent or alarming; describe progress at whatever pace it happened at, including no change.
- Never suggest skipping meals, fasting, or extreme calorie deficits. Be supportive of any body, any pace of progress.
- This app is not a medical device. Keep that framing implicit in tone, not as a disclaimer in every field.

Output strictly the requested JSON fields: a 2-4 sentence narrative summarizing the month, and 1-3 insight strings grounded only in the given facts.`;

export function buildMonthlyUserPrompt(facts: MonthlyFacts): string {
  const weightLine =
    facts.currentWeightKg === null
      ? 'Weight: not logged.'
      : facts.weightChangeKg === null
        ? `Current weight: ${facts.currentWeightKg}kg (no prior month to compare).`
        : `Current weight: ${facts.currentWeightKg}kg, change vs last month: ${facts.weightChangeKg > 0 ? '+' : ''}${facts.weightChangeKg}kg.`;

  return `This user's month: ${facts.periodStart} to ${facts.periodEnd}, ${facts.daysLogged} day(s) logged.

Monthly score (already computed, do not recalculate): ${facts.monthlyScore}/100. Trend vs prior period: ${facts.scoreTrend}.

Averages: ${facts.averages.steps} steps/day, ${facts.averages.sleepHours}h sleep/night, ${facts.averages.waterL}L water/day, ${facts.averages.proteinG}g protein/day.

${weightLine}`;
}

// ---- goal-generator ----

export const GOAL_GENERATOR_SYSTEM_PROMPT = `You are Saathi, a supportive health-tracking coach for users in India, writing next month's goals.

Rules you must always follow:
- The numeric targets are already decided — your only job is to write one short, encouraging reason (under 20 words) for each target, plus one short sugar-reduction tip line.
- Never propose a different number than the one given for any target.
- Never suggest skipping meals, fasting, or extreme calorie deficits.
- Keep the sugar-reduction tip practical and India-relevant (e.g. chai/snacking habits), not a clinical instruction.
- This app is not a medical device.

Output strictly the requested JSON fields: a one-line rationale for each of target_weight, daily_steps, sleep, water, protein, and workouts (omit target_weight's rationale if no target weight was given), plus one sugar_reduction_note line.`;

export type GoalPromptProfile = {
  primaryGoal: Goal;
  activityLevel: ActivityLevel;
};

export function buildGoalGeneratorUserPrompt(profile: GoalPromptProfile, targets: MonthlyGoalTargets): string {
  return `User's primary goal: ${profile.primaryGoal}. Activity level: ${profile.activityLevel}.

Next month's targets (already decided, do not recalculate):
${targets.targetWeightKg !== null ? `- target_weight: ${targets.targetWeightKg}kg` : '- target_weight: none set'}
- daily_steps: ${targets.dailyStepGoal} steps/day
- sleep: ${targets.sleepGoalHours}h/night
- water: ${targets.waterGoalL}L/day
- protein: ${targets.proteinGoalG}g/day
- workouts: ${targets.workoutGoalPerWeek} sessions/week`;
}
