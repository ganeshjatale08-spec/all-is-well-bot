import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { useToastStore } from '../../../lib/toast';
import { useSession } from '../../auth/SessionProvider';
import type {
  FoodCustomEntryInput,
  MoodEntryInput,
  SleepEntryInput,
  SymptomEntryInput,
  WaterEntryInput,
  WorkoutEntryInput,
} from '../../../schemas/journal';
import { todayDateString } from './useDailyLog';

// Every entry table FKs to daily_log_id, and daily_logs has a unique
// (user_id, log_date) constraint — upsert is the single round-trip way to
// get-or-create today's row without a race between a select and an insert.
async function ensureTodayDailyLogId(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('daily_logs')
    .upsert({ user_id: userId, log_date: todayDateString() }, { onConflict: 'user_id,log_date' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

function invalidateToday(queryClient: ReturnType<typeof useQueryClient>, userId: string | undefined) {
  const today = todayDateString();
  queryClient.invalidateQueries({ queryKey: ['todayStatus', userId, today] });
  queryClient.invalidateQueries({ queryKey: ['journalDay', userId, today] });
}

export type SelectedFoodInput = {
  meal: string;
  food_id: string;
  servings: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export function useLogFoodFromDb() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const show = useToastStore((state) => state.show);

  return useMutation({
    mutationFn: async (input: SelectedFoodInput) => {
      if (!userId) throw new Error('No active session');
      const dailyLogId = await ensureTodayDailyLogId(userId);
      const { error } = await supabase.from('food_entries').insert({
        user_id: userId,
        daily_log_id: dailyLogId,
        meal: input.meal,
        food_id: input.food_id,
        servings: input.servings,
        kcal: input.kcal,
        protein_g: input.protein_g,
        carbs_g: input.carbs_g,
        fat_g: input.fat_g,
        source: 'db',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateToday(queryClient, userId);
      show('Food logged.', 'success');
    },
  });
}

export function useLogCustomFood() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const show = useToastStore((state) => state.show);

  return useMutation({
    mutationFn: async (input: FoodCustomEntryInput) => {
      if (!userId) throw new Error('No active session');
      const dailyLogId = await ensureTodayDailyLogId(userId);
      const { error } = await supabase.from('food_entries').insert({
        user_id: userId,
        daily_log_id: dailyLogId,
        meal: input.meal,
        custom_name: input.custom_name,
        servings: 1,
        kcal: input.kcal,
        protein_g: input.protein_g,
        carbs_g: input.carbs_g,
        fat_g: input.fat_g,
        source: 'custom',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateToday(queryClient, userId);
      show('Food logged.', 'success');
    },
  });
}

// Water is dual-write: an append-only water_entries row (the log) plus the
// denormalized daily_logs.water_l running total the score/ring read from.
// Read-then-write — acceptable for MVP single-device usage (TRD §7 notes a
// future increment RPC if multi-device concurrency becomes a problem).
export function useLogWater() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const show = useToastStore((state) => state.show);

  return useMutation({
    mutationFn: async (input: WaterEntryInput) => {
      if (!userId) throw new Error('No active session');
      const dailyLogId = await ensureTodayDailyLogId(userId);

      const { error: insertError } = await supabase.from('water_entries').insert({
        user_id: userId,
        daily_log_id: dailyLogId,
        amount_l: input.amount_l,
      });
      if (insertError) throw insertError;

      const { data: current, error: readError } = await supabase
        .from('daily_logs')
        .select('water_l')
        .eq('id', dailyLogId)
        .single();
      if (readError) throw readError;

      const { error: updateError } = await supabase
        .from('daily_logs')
        .update({ water_l: (current.water_l ?? 0) + input.amount_l })
        .eq('id', dailyLogId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      invalidateToday(queryClient, userId);
      show('Water logged.', 'success');
    },
  });
}

// Sleep lives directly on daily_logs (BACKEND_SCHEMA §4) — not a child table.
export function useLogSleep() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const show = useToastStore((state) => state.show);

  return useMutation({
    mutationFn: async (input: SleepEntryInput) => {
      if (!userId) throw new Error('No active session');
      const dailyLogId = await ensureTodayDailyLogId(userId);
      const { error } = await supabase
        .from('daily_logs')
        .update({ sleep_hours: input.sleep_hours, sleep_quality: input.sleep_quality ?? null })
        .eq('id', dailyLogId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateToday(queryClient, userId);
      show('Sleep logged.', 'success');
    },
  });
}

export function useLogWorkout() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const show = useToastStore((state) => state.show);

  return useMutation({
    mutationFn: async (input: WorkoutEntryInput) => {
      if (!userId) throw new Error('No active session');
      const dailyLogId = await ensureTodayDailyLogId(userId);
      const { error } = await supabase.from('workout_entries').insert({
        user_id: userId,
        daily_log_id: dailyLogId,
        workout_type: input.workout_type,
        duration_min: input.duration_min,
        calories_burned: input.calories_burned ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateToday(queryClient, userId);
      show('Workout logged.', 'success');
    },
  });
}

// Mood/energy/stress live directly on daily_logs (BACKEND_SCHEMA §4) — not a
// child table.
export function useLogMood() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const show = useToastStore((state) => state.show);

  return useMutation({
    mutationFn: async (input: MoodEntryInput) => {
      if (!userId) throw new Error('No active session');
      const dailyLogId = await ensureTodayDailyLogId(userId);
      const { error } = await supabase
        .from('daily_logs')
        .update({
          mood: input.mood,
          energy_level: input.energy_level ?? null,
          stress_level: input.stress_level ?? null,
        })
        .eq('id', dailyLogId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateToday(queryClient, userId);
      show('Mood logged.', 'success');
    },
  });
}

export function useLogSymptom() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const show = useToastStore((state) => state.show);

  return useMutation({
    mutationFn: async (input: SymptomEntryInput) => {
      if (!userId) throw new Error('No active session');
      const dailyLogId = await ensureTodayDailyLogId(userId);
      const { error } = await supabase.from('symptom_entries').insert({
        user_id: userId,
        daily_log_id: dailyLogId,
        symptom: input.symptom,
        severity: input.severity ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateToday(queryClient, userId);
      show('Symptom logged.', 'success');
    },
  });
}

export function useLogSupplement() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const show = useToastStore((state) => state.show);

  return useMutation({
    mutationFn: async (name: string) => {
      if (!userId) throw new Error('No active session');
      const dailyLogId = await ensureTodayDailyLogId(userId);
      const { error } = await supabase.from('supplement_entries').insert({
        user_id: userId,
        daily_log_id: dailyLogId,
        name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateToday(queryClient, userId);
      show('Supplement logged.', 'success');
    },
  });
}

export function useDeleteEntry(table: 'food_entries' | 'workout_entries' | 'symptom_entries' | 'supplement_entries') {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const show = useToastStore((state) => state.show);

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateToday(queryClient, userId);
      show('Entry removed.', 'default');
    },
  });
}

// Water needs its own delete: the daily_logs.water_l running total must be
// decremented by the deleted entry's amount, not just the log row removed.
export function useDeleteWaterEntry() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const show = useToastStore((state) => state.show);

  return useMutation({
    mutationFn: async (input: { id: string; dailyLogId: string; amountL: number }) => {
      const { error: deleteError } = await supabase.from('water_entries').delete().eq('id', input.id);
      if (deleteError) throw deleteError;

      const { data: current, error: readError } = await supabase
        .from('daily_logs')
        .select('water_l')
        .eq('id', input.dailyLogId)
        .single();
      if (readError) throw readError;

      const { error: updateError } = await supabase
        .from('daily_logs')
        .update({ water_l: Math.max(0, (current.water_l ?? 0) - input.amountL) })
        .eq('id', input.dailyLogId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      invalidateToday(queryClient, userId);
      show('Entry removed.', 'default');
    },
  });
}
