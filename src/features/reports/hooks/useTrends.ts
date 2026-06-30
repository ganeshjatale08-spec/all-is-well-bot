import { useQuery } from '@tanstack/react-query';

import {
  calculateDailyTargets,
  type ActivityLevel,
  type Goal,
  type Sex,
} from '../../../domain/metrics';
import { calculateDailyScoreBreakdown } from '../../../domain/scoring';
import { sumMacros, type FoodEntryMacros } from '../../../domain/nutrition';
import { supabase } from '../../../lib/supabase';
import { useSession } from '../../auth/SessionProvider';
import { useProfile, type ProfileRow } from '../../onboarding/hooks/useProfile';

// Insights tab range toggle (UI_UX_DESIGN §4: "week / month / 3-month").
// Rolling windows ending today, not calendar-aligned — weekly/monthly
// *reports* already cover the calendar-aligned periods (Mon-Sun, 1st-EOM);
// this is just the trend-chart view.
export type TrendRange = 'week' | 'month' | '3month';

const RANGE_DAYS: Record<TrendRange, number> = { week: 7, month: 30, '3month': 90 };

function dateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rangeToDates(range: TrendRange): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (RANGE_DAYS[range] - 1));
  return { startDate: dateString(start), endDate: dateString(end) };
}

function isProfileComplete(profile: ProfileRow | null | undefined): profile is ProfileRow {
  return !!(
    profile?.age &&
    profile.sex &&
    profile.weight_kg &&
    profile.height_cm &&
    profile.activity_level &&
    profile.primary_goal
  );
}

export type TrendDay = {
  date: string;
  score: number;
  steps: number;
  sleepHours: number | null;
  waterL: number;
  proteinG: number;
};

export type WeightPoint = { date: string; weightKg: number };

export type TrendData = { days: TrendDay[]; weightPoints: WeightPoint[] };

export function trendsQueryKey(userId: string | undefined, range: TrendRange) {
  return ['trends', userId, range] as const;
}

// Recomputes each day's score from source tables — the same bulk-aggregate
// approach as supabase/functions/_shared/reportAggregation.ts, mirrored
// client-side, since `daily_logs.deterministic_score` isn't persisted by any
// client mutation yet (a known Phase 3 gap, out of scope here).
export function useTrends(range: TrendRange) {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: profile } = useProfile();
  const { startDate, endDate } = rangeToDates(range);

  return useQuery({
    queryKey: trendsQueryKey(userId, range),
    queryFn: async (): Promise<TrendData> => {
      if (!isProfileComplete(profile)) return { days: [], weightPoints: [] };

      const targets = calculateDailyTargets({
        sex: profile.sex as Sex,
        weightKg: profile.weight_kg!,
        heightCm: profile.height_cm!,
        age: profile.age!,
        activityLevel: profile.activity_level as ActivityLevel,
        goal: profile.primary_goal as Goal,
      });

      const { data: logs, error: logsError } = await supabase
        .from('daily_logs')
        .select('id, log_date, steps, sleep_hours, water_l')
        .eq('user_id', userId)
        .gte('log_date', startDate)
        .lte('log_date', endDate)
        .order('log_date', { ascending: true });
      if (logsError) throw logsError;

      const logIds = (logs ?? []).map((log) => log.id);
      const [foodResult, workoutResult, symptomResult, reportsResult] = await Promise.all([
        logIds.length > 0
          ? supabase
              .from('food_entries')
              .select('daily_log_id, servings, kcal, protein_g, carbs_g, fat_g')
              .in('daily_log_id', logIds)
          : Promise.resolve({ data: [], error: null }),
        logIds.length > 0
          ? supabase.from('workout_entries').select('daily_log_id, duration_min').in('daily_log_id', logIds)
          : Promise.resolve({ data: [], error: null }),
        logIds.length > 0
          ? supabase.from('symptom_entries').select('daily_log_id, severity').in('daily_log_id', logIds)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('reports')
          .select('period_start, summary')
          .eq('user_id', userId)
          .eq('period', 'monthly')
          .gte('period_start', startDate.slice(0, 7) + '-01')
          .lte('period_start', endDate)
          .order('period_start', { ascending: true }),
      ]);
      if (foodResult.error) throw foodResult.error;
      if (workoutResult.error) throw workoutResult.error;
      if (symptomResult.error) throw symptomResult.error;
      if (reportsResult.error) throw reportsResult.error;

      function groupBy<T extends { daily_log_id: string }>(rows: readonly T[]): Map<string, T[]> {
        const map = new Map<string, T[]>();
        for (const row of rows) {
          const bucket = map.get(row.daily_log_id);
          if (bucket) bucket.push(row);
          else map.set(row.daily_log_id, [row]);
        }
        return map;
      }

      const foodByLog = groupBy(foodResult.data ?? []);
      const workoutByLog = groupBy(workoutResult.data ?? []);
      const symptomByLog = groupBy(symptomResult.data ?? []);

      const days: TrendDay[] = (logs ?? []).map((log) => {
        const macroEntries: FoodEntryMacros[] = (foodByLog.get(log.id) ?? []).map((row) => ({
          servings: row.servings,
          kcal: row.kcal,
          proteinG: row.protein_g,
          carbsG: row.carbs_g,
          fatG: row.fat_g,
        }));
        const macros = sumMacros(macroEntries);
        const workoutMinutes = (workoutByLog.get(log.id) ?? []).reduce(
          (sum, row) => sum + row.duration_min,
          0,
        );
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
          steps: log.steps ?? 0,
          sleepHours: log.sleep_hours,
          waterL: log.water_l ?? 0,
          proteinG: macros.proteinG,
        };
      });

      // Weight has no time-series table (BACKEND_SCHEMA has none) — reused
      // from each monthly report's own summary snapshot, the same
      // once-a-month-for-free pattern monthly-report itself uses to diff
      // against the prior month.
      const weightPoints: WeightPoint[] = (reportsResult.data ?? [])
        .map((row) => {
          const summary = row.summary as { current_weight_kg?: number | null } | null;
          const weightKg = summary?.current_weight_kg;
          return weightKg != null ? { date: row.period_start, weightKg } : null;
        })
        .filter((point): point is WeightPoint => point !== null);

      return { days, weightPoints };
    },
    enabled: !!userId && isProfileComplete(profile),
  });
}
