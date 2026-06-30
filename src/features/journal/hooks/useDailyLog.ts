import { useQuery } from '@tanstack/react-query';

import { sumMacros, type FoodEntryMacros, type MacroTotals } from '../../../domain/nutrition';
import { supabase } from '../../../lib/supabase';
import { useSession } from '../../auth/SessionProvider';

export type DailyLogRow = {
  id: string;
  log_date: string;
  steps: number;
  distance_km: number;
  sleep_hours: number | null;
  sleep_quality: number | null;
  mood: string | null;
  energy_level: number | null;
  stress_level: number | null;
  water_l: number;
  deterministic_score: number | null;
};

export type TodayStatus = {
  dailyLog: DailyLogRow | null;
  macros: MacroTotals;
  workoutMinutes: number;
  symptomSeverities: number[];
};

const EMPTY_TODAY_STATUS: TodayStatus = {
  dailyLog: null,
  macros: sumMacros([]),
  workoutMinutes: 0,
  symptomSeverities: [],
};

// Local calendar date, not UTC — "today" must match the user's day, not
// Postgres's. log_date is a plain date column (BACKEND_SCHEMA §3).
export function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayStatusQueryKey(userId: string | undefined) {
  return ['todayStatus', userId, todayDateString()] as const;
}

export function useTodayStatus() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: todayStatusQueryKey(userId),
    queryFn: async (): Promise<TodayStatus> => {
      const { data: dailyLog, error: logError } = await supabase
        .from('daily_logs')
        .select(
          'id, log_date, steps, distance_km, sleep_hours, sleep_quality, mood, energy_level, stress_level, water_l, deterministic_score',
        )
        .eq('user_id', userId)
        .eq('log_date', todayDateString())
        .maybeSingle();
      if (logError) throw logError;
      if (!dailyLog) return EMPTY_TODAY_STATUS;

      const [foodResult, workoutResult, symptomResult] = await Promise.all([
        supabase
          .from('food_entries')
          .select('servings, kcal, protein_g, carbs_g, fat_g')
          .eq('daily_log_id', dailyLog.id),
        supabase.from('workout_entries').select('duration_min').eq('daily_log_id', dailyLog.id),
        supabase.from('symptom_entries').select('severity').eq('daily_log_id', dailyLog.id),
      ]);
      if (foodResult.error) throw foodResult.error;
      if (workoutResult.error) throw workoutResult.error;
      if (symptomResult.error) throw symptomResult.error;

      const macroEntries: FoodEntryMacros[] = (foodResult.data ?? []).map((row) => ({
        servings: row.servings,
        kcal: row.kcal,
        proteinG: row.protein_g,
        carbsG: row.carbs_g,
        fatG: row.fat_g,
      }));

      const workoutMinutes = (workoutResult.data ?? []).reduce(
        (sum, row) => sum + row.duration_min,
        0,
      );

      const symptomSeverities = (symptomResult.data ?? [])
        .map((row) => row.severity)
        .filter((severity): severity is number => severity !== null);

      return {
        dailyLog: dailyLog as DailyLogRow,
        macros: sumMacros(macroEntries),
        workoutMinutes,
        symptomSeverities,
      };
    },
    enabled: !!userId,
  });
}
