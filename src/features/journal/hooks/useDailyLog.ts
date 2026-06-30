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

export function todayStatusQueryKey(userId: string | undefined) {
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

export type JournalFoodEntry = {
  id: string;
  meal: string;
  food_name: string | null;
  servings: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type JournalWaterEntry = { id: string; amount_l: number; logged_at: string };
export type JournalWorkoutEntry = {
  id: string;
  workout_type: string;
  duration_min: number;
  calories_burned: number | null;
};
export type JournalSymptomEntry = { id: string; symptom: string; severity: number | null };
export type JournalSupplementEntry = { id: string; name: string };

export type JournalDay = {
  dailyLog: DailyLogRow | null;
  foodEntries: JournalFoodEntry[];
  waterEntries: JournalWaterEntry[];
  workoutEntries: JournalWorkoutEntry[];
  symptomEntries: JournalSymptomEntry[];
  supplementEntries: JournalSupplementEntry[];
};

export const EMPTY_JOURNAL_DAY: JournalDay = {
  dailyLog: null,
  foodEntries: [],
  waterEntries: [],
  workoutEntries: [],
  symptomEntries: [],
  supplementEntries: [],
};

export function journalDayQueryKey(userId: string | undefined, date: string) {
  return ['journalDay', userId, date] as const;
}

// Projects a JournalDay onto the TodayStatus shape so optimistic mutations
// (useLogMutations) can patch both the Journal screen's cache and the Home
// ring's cache from a single updated entry list and never disagree.
export function deriveTodayStatus(day: JournalDay): TodayStatus {
  const macroEntries: FoodEntryMacros[] = day.foodEntries.map((entry) => ({
    servings: entry.servings,
    kcal: entry.kcal,
    proteinG: entry.protein_g,
    carbsG: entry.carbs_g,
    fatG: entry.fat_g,
  }));

  return {
    dailyLog: day.dailyLog,
    macros: sumMacros(macroEntries),
    workoutMinutes: day.workoutEntries.reduce((sum, entry) => sum + entry.duration_min, 0),
    symptomSeverities: day.symptomEntries
      .map((entry) => entry.severity)
      .filter((severity): severity is number => severity !== null),
  };
}

// Full day view for the Journal screen (UI_UX_DESIGN §4) — every section's
// entries plus the daily_logs row for sleep/mood/energy/stress.
export function useJournalDay(date: string) {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: journalDayQueryKey(userId, date),
    queryFn: async (): Promise<JournalDay> => {
      const { data: dailyLog, error: logError } = await supabase
        .from('daily_logs')
        .select(
          'id, log_date, steps, distance_km, sleep_hours, sleep_quality, mood, energy_level, stress_level, water_l, deterministic_score',
        )
        .eq('user_id', userId)
        .eq('log_date', date)
        .maybeSingle();
      if (logError) throw logError;
      if (!dailyLog) return EMPTY_JOURNAL_DAY;

      const [foodResult, waterResult, workoutResult, symptomResult, supplementResult] = await Promise.all([
        supabase
          .from('food_entries')
          .select('id, meal, servings, kcal, protein_g, carbs_g, fat_g, custom_name, foods(name)')
          .eq('daily_log_id', dailyLog.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('water_entries')
          .select('id, amount_l, logged_at')
          .eq('daily_log_id', dailyLog.id)
          .order('logged_at', { ascending: true }),
        supabase
          .from('workout_entries')
          .select('id, workout_type, duration_min, calories_burned')
          .eq('daily_log_id', dailyLog.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('symptom_entries')
          .select('id, symptom, severity')
          .eq('daily_log_id', dailyLog.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('supplement_entries')
          .select('id, name')
          .eq('daily_log_id', dailyLog.id)
          .order('created_at', { ascending: true }),
      ]);
      if (foodResult.error) throw foodResult.error;
      if (waterResult.error) throw waterResult.error;
      if (workoutResult.error) throw workoutResult.error;
      if (symptomResult.error) throw symptomResult.error;
      if (supplementResult.error) throw supplementResult.error;

      type FoodRow = {
        id: string;
        meal: string;
        servings: number;
        kcal: number;
        protein_g: number;
        carbs_g: number;
        fat_g: number;
        custom_name: string | null;
        foods: { name: string } | null;
      };

      const foodEntries: JournalFoodEntry[] = ((foodResult.data ?? []) as unknown as FoodRow[]).map((row) => ({
        id: row.id,
        meal: row.meal,
        food_name: row.foods?.name ?? row.custom_name,
        servings: row.servings,
        kcal: row.kcal,
        protein_g: row.protein_g,
        carbs_g: row.carbs_g,
        fat_g: row.fat_g,
      }));

      return {
        dailyLog: dailyLog as DailyLogRow,
        foodEntries,
        waterEntries: (waterResult.data ?? []) as JournalWaterEntry[],
        workoutEntries: (workoutResult.data ?? []) as JournalWorkoutEntry[],
        symptomEntries: (symptomResult.data ?? []) as JournalSymptomEntry[],
        supplementEntries: (supplementResult.data ?? []) as JournalSupplementEntry[],
      };
    },
    enabled: !!userId,
  });
}
