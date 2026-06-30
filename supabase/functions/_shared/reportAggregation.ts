// Shared bulk aggregation for weekly-report / monthly-report / goal-generator
// (HARD RULE 2: every number below is computed here, server-side, from raw
// entry rows — the LLM never sees raw entries and never computes a number,
// only narrates/selects from the facts this module produces).
//
// Deliberately NOT reading `daily_logs.deterministic_score` (that column
// exists in the schema but nothing currently writes it — a pre-existing gap
// from Phase 3, out of scope here). Instead this recomputes each day's score
// from source tables, the same way daily-analysis does for a single day, but
// batched: one query per table for the whole date range rather than one set
// of queries per day, so a monthly report costs ~4 queries total instead of
// up to ~120.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  calculateDailyScoreBreakdown,
  sumMacros,
  type DailyScoreBreakdown,
  type DailyTargets,
  type FoodEntryMacros,
} from './domain.ts';

export type DailyAggregate = {
  date: string;
  score: number;
  breakdown: DailyScoreBreakdown;
  kcal: number;
  proteinG: number;
  waterL: number;
  sleepHours: number | null;
  steps: number;
  workoutMinutes: number;
  symptomCount: number;
};

function groupBy<T extends { daily_log_id: string }>(rows: readonly T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const bucket = map.get(row.daily_log_id);
    if (bucket) bucket.push(row);
    else map.set(row.daily_log_id, [row]);
  }
  return map;
}

// startDate/endDate are inclusive 'YYYY-MM-DD'. Only returns days that have a
// daily_logs row — days the user never opened the app simply aren't in the
// result, callers treat the result length as "days logged."
export async function fetchDailyAggregates(
  supabase: SupabaseClient,
  userId: string,
  targets: DailyTargets,
  startDate: string,
  endDate: string,
): Promise<DailyAggregate[]> {
  const { data: logs, error: logsError } = await supabase
    .from('daily_logs')
    .select('id, log_date, steps, sleep_hours, water_l')
    .eq('user_id', userId)
    .gte('log_date', startDate)
    .lte('log_date', endDate)
    .order('log_date', { ascending: true });
  if (logsError) throw logsError;
  if (!logs || logs.length === 0) return [];

  const logIds = logs.map((log) => log.id);

  const [foodResult, workoutResult, symptomResult] = await Promise.all([
    supabase
      .from('food_entries')
      .select('daily_log_id, servings, kcal, protein_g, carbs_g, fat_g')
      .in('daily_log_id', logIds),
    supabase.from('workout_entries').select('daily_log_id, duration_min').in('daily_log_id', logIds),
    supabase.from('symptom_entries').select('daily_log_id, severity').in('daily_log_id', logIds),
  ]);
  if (foodResult.error) throw foodResult.error;
  if (workoutResult.error) throw workoutResult.error;
  if (symptomResult.error) throw symptomResult.error;

  const foodByLog = groupBy(foodResult.data ?? []);
  const workoutByLog = groupBy(workoutResult.data ?? []);
  const symptomByLog = groupBy(symptomResult.data ?? []);

  return logs.map((log) => {
    const macroEntries: FoodEntryMacros[] = (foodByLog.get(log.id) ?? []).map((row) => ({
      servings: row.servings,
      kcal: row.kcal,
      proteinG: row.protein_g,
      carbsG: row.carbs_g,
      fatG: row.fat_g,
    }));
    const macros = sumMacros(macroEntries);
    const workoutMinutes = (workoutByLog.get(log.id) ?? []).reduce((sum, row) => sum + row.duration_min, 0);
    const symptomSeverities = (symptomByLog.get(log.id) ?? [])
      .map((row) => row.severity)
      .filter((value): value is number => value !== null);

    const breakdown = calculateDailyScoreBreakdown({
      actualCalorieKcal: macros.kcal,
      calorieTargetKcal: targets.calorieTargetKcal,
      actualProteinG: macros.proteinG,
      proteinTargetG: targets.proteinTargetG,
      actualWaterL: log.water_l ?? 0,
      waterTargetL: targets.waterTargetL,
      actualSleepHours: log.sleep_hours ?? 0,
      sleepTargetHours: targets.sleepTargetHours,
      steps: log.steps ?? 0,
      workoutMinutes,
      symptomSeverities,
    });

    return {
      date: log.log_date,
      score: breakdown.total,
      breakdown,
      kcal: macros.kcal,
      proteinG: macros.proteinG,
      waterL: log.water_l ?? 0,
      sleepHours: log.sleep_hours,
      steps: log.steps ?? 0,
      workoutMinutes,
      symptomCount: (symptomByLog.get(log.id) ?? []).length,
    };
  });
}

function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// % of logged days where a component scored >= 80/100 — the deterministic
// "hit rate" facts the LLM is given to ground achievements/improvement areas
// in, rather than letting it invent which habits went well.
function hitRate(days: readonly DailyAggregate[], pick: (day: DailyAggregate) => number): number {
  if (days.length === 0) return 0;
  const hits = days.filter((day) => pick(day) >= 80).length;
  return Math.round((hits / days.length) * 100);
}

export type WeeklyFacts = {
  periodStart: string;
  periodEnd: string;
  daysLogged: number;
  weeklyScore: number;
  totals: {
    steps: number;
    workoutMinutes: number;
    workoutCount: number;
    sleepAvgHours: number;
    waterAvgL: number;
    proteinAvgG: number;
  };
  hitRates: { calorie: number; protein: number; water: number; sleep: number; activity: number };
  bestDay: { date: string; score: number } | null;
  worstDay: { date: string; score: number } | null;
  symptomDays: number;
};

export function buildWeeklyFacts(periodStart: string, periodEnd: string, days: readonly DailyAggregate[]): WeeklyFacts {
  const scores = days.map((day) => day.score);
  const best = days.reduce<DailyAggregate | null>(
    (max, day) => (max === null || day.score > max.score ? day : max),
    null,
  );
  const worst = days.reduce<DailyAggregate | null>(
    (min, day) => (min === null || day.score < min.score ? day : min),
    null,
  );

  return {
    periodStart,
    periodEnd,
    daysLogged: days.length,
    weeklyScore: Math.round(average(scores)),
    totals: {
      steps: days.reduce((sum, day) => sum + day.steps, 0),
      workoutMinutes: days.reduce((sum, day) => sum + day.workoutMinutes, 0),
      workoutCount: days.filter((day) => day.workoutMinutes > 0).length,
      sleepAvgHours: Math.round(average(days.map((day) => day.sleepHours ?? 0)) * 10) / 10,
      waterAvgL: Math.round(average(days.map((day) => day.waterL)) * 10) / 10,
      proteinAvgG: Math.round(average(days.map((day) => day.proteinG))),
    },
    hitRates: {
      calorie: hitRate(days, (day) => day.breakdown.calorieScore),
      protein: hitRate(days, (day) => day.breakdown.proteinScore),
      water: hitRate(days, (day) => day.breakdown.waterScore),
      sleep: hitRate(days, (day) => day.breakdown.sleepScore),
      activity: hitRate(days, (day) => day.breakdown.activityScore),
    },
    bestDay: best ? { date: best.date, score: best.score } : null,
    worstDay: worst ? { date: worst.date, score: worst.score } : null,
    symptomDays: days.filter((day) => day.symptomCount > 0).length,
  };
}

export type ScoreTrend = 'improving' | 'steady' | 'declining';

const TREND_THRESHOLD = 3; // points; smaller diffs read as noise, not a trend

function compareTrend(current: number, previous: number): ScoreTrend {
  const diff = current - previous;
  if (diff >= TREND_THRESHOLD) return 'improving';
  if (diff <= -TREND_THRESHOLD) return 'declining';
  return 'steady';
}

export type MonthlyFacts = {
  periodStart: string;
  periodEnd: string;
  daysLogged: number;
  monthlyScore: number;
  scoreTrend: ScoreTrend;
  averages: { sleepHours: number; steps: number; proteinG: number; waterL: number };
  currentWeightKg: number | null;
  weightChangeKg: number | null;
};

// previousMonthlyScore/previousWeightKg come from the prior month's `reports`
// row (this month is the first one on record when there is no prior row) —
// see monthly-report/index.ts for where that lookup happens. Storing the
// snapshot in each report's own summary, rather than adding a weight-history
// table, is a deliberate choice: BACKEND_SCHEMA has no weight-log table, and
// `reports` already gives us a once-a-month time series for free.
export function buildMonthlyFacts(
  periodStart: string,
  periodEnd: string,
  days: readonly DailyAggregate[],
  currentWeightKg: number | null,
  previousMonthlyScore: number | null,
  previousWeightKg: number | null,
): MonthlyFacts {
  const scores = days.map((day) => day.score);
  const monthlyScore = Math.round(average(scores));

  let scoreTrend: ScoreTrend;
  if (previousMonthlyScore !== null) {
    scoreTrend = compareTrend(monthlyScore, previousMonthlyScore);
  } else {
    const midpoint = Math.floor(days.length / 2);
    const firstHalf = average(days.slice(0, midpoint).map((day) => day.score));
    const secondHalf = average(days.slice(midpoint).map((day) => day.score));
    scoreTrend = compareTrend(secondHalf, firstHalf);
  }

  return {
    periodStart,
    periodEnd,
    daysLogged: days.length,
    monthlyScore,
    scoreTrend,
    averages: {
      sleepHours: Math.round(average(days.map((day) => day.sleepHours ?? 0)) * 10) / 10,
      steps: Math.round(average(days.map((day) => day.steps))),
      proteinG: Math.round(average(days.map((day) => day.proteinG))),
      waterL: Math.round(average(days.map((day) => day.waterL)) * 10) / 10,
    },
    currentWeightKg,
    weightChangeKg:
      currentWeightKg !== null && previousWeightKg !== null
        ? Math.round((currentWeightKg - previousWeightKg) * 10) / 10
        : null,
  };
}
