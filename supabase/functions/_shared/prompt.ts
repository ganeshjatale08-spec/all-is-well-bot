// Prompt assembly for daily-analysis (TRD §5). The system prompt is static
// text (no per-user values) so it stays byte-identical across calls and
// benefits from Gemini's implicit prefix caching (see gemini.ts). All
// per-user values — profile + today's numbers — go in the user prompt,
// already computed by domain.ts; the model is told explicitly not to
// recompute them (HARD RULE 2).
import type { Sex, ActivityLevel, Goal } from './domain.ts';

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
