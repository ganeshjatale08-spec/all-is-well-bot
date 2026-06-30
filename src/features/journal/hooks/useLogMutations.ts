import { useMutation, type MutationKey } from '@tanstack/react-query';

import { queryClient } from '../../../lib/queryClient';
import { supabase } from '../../../lib/supabase';
import { useToastStore } from '../../../lib/toast';
import { generateLocalId } from '../../../lib/uuid';
import type {
  FoodCustomEntryInput,
  MoodEntryInput,
  SleepEntryInput,
  SymptomEntryInput,
  WaterEntryInput,
  WorkoutEntryInput,
} from '../../../schemas/journal';
import {
  deriveTodayStatus,
  EMPTY_JOURNAL_DAY,
  journalDayQueryKey,
  todayDateString,
  todayStatusQueryKey,
  type DailyLogRow,
  type JournalDay,
  type JournalFoodEntry,
  type JournalSupplementEntry,
  type JournalSymptomEntry,
  type JournalWaterEntry,
  type JournalWorkoutEntry,
  type TodayStatus,
} from './useDailyLog';

// Journal writes are offline-first (TRD §7): every mutation here is
// registered with the shared queryClient via setMutationDefaults so it can
// be queued while offline (TanStack Query auto-pauses mutations when
// onlineManager reports offline, see lib/network.ts), persisted to disk
// (lib/persister.ts), and resumed/retried on reconnect or app restart —
// even if no component using the hook is mounted at that point. The
// instant score update (also TRD §7 / PRD §8) comes from each mutation's
// onMutate patching the cached TodayStatus + JournalDay synchronously, so
// the Home ring and Journal screen update before the network round trip
// completes; onSettled then invalidates to reconcile with server truth.

// Reads the session directly from supabase-js (cached in memory, no network
// call) rather than via the useSession() hook, since mutation defaults are
// registered once at module load — outside any component tree — and must
// also work when a paused mutation resumes after an app restart.
async function getUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const userId = data.session?.user.id;
  if (!userId) throw new Error('Not signed in');
  return userId;
}

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

function invalidateToday(userId: string) {
  const today = todayDateString();
  queryClient.invalidateQueries({ queryKey: ['todayStatus', userId, today] });
  queryClient.invalidateQueries({ queryKey: ['journalDay', userId, today] });
}

// Synthesizes a placeholder daily_logs row when none is cached yet, so the
// very first optimistic entry of the day still renders a non-empty Journal
// screen instead of falling back to its "no entries yet" empty state. The
// real row (with a real id) replaces this on the post-mutation invalidate.
function withDailyLog(day: JournalDay, patch: Partial<DailyLogRow> = {}): DailyLogRow {
  const base: DailyLogRow = day.dailyLog ?? {
    id: `optimistic-${generateLocalId()}`,
    log_date: todayDateString(),
    steps: 0,
    distance_km: 0,
    sleep_hours: null,
    sleep_quality: null,
    mood: null,
    energy_level: null,
    stress_level: null,
    water_l: 0,
    deterministic_score: null,
  };
  return { ...base, ...patch };
}

function removeById<T extends { id: string }>(list: readonly T[], id: string): T[] {
  return list.filter((entry) => entry.id !== id);
}

type JournalSnapshot = { prevJournal: JournalDay | undefined; prevStatus: TodayStatus | undefined };
type OptimisticContext = { userId: string } & JournalSnapshot;

async function applyOptimisticJournalUpdate(
  userId: string,
  updater: (day: JournalDay) => JournalDay,
): Promise<JournalSnapshot> {
  const today = todayDateString();
  const journalKey = journalDayQueryKey(userId, today);
  const statusKey = todayStatusQueryKey(userId);

  await queryClient.cancelQueries({ queryKey: journalKey });
  await queryClient.cancelQueries({ queryKey: statusKey });

  const prevJournal = queryClient.getQueryData<JournalDay>(journalKey);
  const prevStatus = queryClient.getQueryData<TodayStatus>(statusKey);

  const nextJournal = updater(prevJournal ?? EMPTY_JOURNAL_DAY);
  queryClient.setQueryData<JournalDay>(journalKey, nextJournal);
  queryClient.setQueryData<TodayStatus>(statusKey, deriveTodayStatus(nextJournal));

  return { prevJournal, prevStatus };
}

function rollbackJournalUpdate(userId: string, snapshot: JournalSnapshot) {
  const today = todayDateString();
  queryClient.setQueryData(journalDayQueryKey(userId, today), snapshot.prevJournal);
  queryClient.setQueryData(todayStatusQueryKey(userId), snapshot.prevStatus);
}

// Builds the {mutationFn, onMutate, onError, onSettled} bundle shared by
// every journal write: resolve the user, optimistically patch the cache,
// run the real Supabase write, roll back + toast on failure, reconcile via
// invalidate once settled (paused/offline mutations only settle once they
// actually run, so this never fires while merely queued).
function createJournalMutationDefault<TInput>(config: {
  mutate: (userId: string, input: TInput) => Promise<void>;
  apply: (day: JournalDay, input: TInput) => JournalDay;
  successMessage: string;
  failureMessage: string;
}) {
  return {
    mutationFn: async (input: TInput): Promise<void> => {
      const userId = await getUserId();
      await config.mutate(userId, input);
    },
    onMutate: async (input: TInput): Promise<OptimisticContext> => {
      const userId = await getUserId();
      const snapshot = await applyOptimisticJournalUpdate(userId, (day) => config.apply(day, input));
      useToastStore.getState().show(config.successMessage, 'success');
      return { userId, ...snapshot };
    },
    onError: (error: unknown, _input: TInput, context: OptimisticContext | undefined) => {
      if (context) rollbackJournalUpdate(context.userId, context);
      useToastStore.getState().show(error instanceof Error ? error.message : config.failureMessage, 'error');
    },
    onSettled: (_data: void | undefined, _error: unknown, _input: TInput, context: OptimisticContext | undefined) => {
      if (context) invalidateToday(context.userId);
    },
  };
}

export type SelectedFoodInput = {
  meal: string;
  food_id: string;
  food_name: string;
  servings: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

const KEYS = {
  logFoodFromDb: ['logFoodFromDb'] as MutationKey,
  logCustomFood: ['logCustomFood'] as MutationKey,
  logWater: ['logWater'] as MutationKey,
  logSleep: ['logSleep'] as MutationKey,
  logWorkout: ['logWorkout'] as MutationKey,
  logMood: ['logMood'] as MutationKey,
  logSymptom: ['logSymptom'] as MutationKey,
  logSupplement: ['logSupplement'] as MutationKey,
  deleteWaterEntry: ['deleteWaterEntry'] as MutationKey,
  deleteEntry: (table: DeletableTable) => ['deleteEntry', table] as MutationKey,
};

export type DeletableTable = 'food_entries' | 'workout_entries' | 'symptom_entries' | 'supplement_entries';
const DELETE_TABLES: readonly DeletableTable[] = [
  'food_entries',
  'workout_entries',
  'symptom_entries',
  'supplement_entries',
];

function applyDelete(table: DeletableTable, day: JournalDay, id: string): JournalDay {
  switch (table) {
    case 'food_entries':
      return { ...day, foodEntries: removeById(day.foodEntries, id) };
    case 'workout_entries':
      return { ...day, workoutEntries: removeById(day.workoutEntries, id) };
    case 'symptom_entries':
      return { ...day, symptomEntries: removeById(day.symptomEntries, id) };
    case 'supplement_entries':
      return { ...day, supplementEntries: removeById(day.supplementEntries, id) };
  }
}

// Registers every journal mutation's real behavior with the shared
// queryClient. Must run before PersistQueryClientProvider's onSuccess calls
// resumePausedMutations() (root layout imports this module eagerly for that
// reason) — restored, paused mutations have no component-supplied
// mutationFn, so they rely entirely on these registered defaults.
export function registerJournalMutationDefaults(): void {
  queryClient.setMutationDefaults(
    KEYS.logFoodFromDb,
    createJournalMutationDefault<SelectedFoodInput>({
      mutate: async (userId, input) => {
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
      apply: (day, input) => {
        const entry: JournalFoodEntry = {
          id: `optimistic-${generateLocalId()}`,
          meal: input.meal,
          food_name: input.food_name,
          servings: input.servings,
          kcal: input.kcal,
          protein_g: input.protein_g,
          carbs_g: input.carbs_g,
          fat_g: input.fat_g,
        };
        return { ...day, dailyLog: withDailyLog(day), foodEntries: [...day.foodEntries, entry] };
      },
      successMessage: 'Food logged.',
      failureMessage: "Couldn't log food.",
    }),
  );

  queryClient.setMutationDefaults(
    KEYS.logCustomFood,
    createJournalMutationDefault<FoodCustomEntryInput>({
      mutate: async (userId, input) => {
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
      apply: (day, input) => {
        const entry: JournalFoodEntry = {
          id: `optimistic-${generateLocalId()}`,
          meal: input.meal,
          food_name: input.custom_name,
          servings: 1,
          kcal: input.kcal,
          protein_g: input.protein_g,
          carbs_g: input.carbs_g,
          fat_g: input.fat_g,
        };
        return { ...day, dailyLog: withDailyLog(day), foodEntries: [...day.foodEntries, entry] };
      },
      successMessage: 'Food logged.',
      failureMessage: "Couldn't log food.",
    }),
  );

  // Water is dual-write: an append-only water_entries row (the log) plus the
  // denormalized daily_logs.water_l running total the score/ring read from.
  // Read-then-write — acceptable for MVP single-device usage (TRD §7 notes a
  // future increment RPC if multi-device concurrency becomes a problem).
  queryClient.setMutationDefaults(
    KEYS.logWater,
    createJournalMutationDefault<WaterEntryInput>({
      mutate: async (userId, input) => {
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
      apply: (day, input) => {
        const dailyLog = withDailyLog(day);
        const entry: JournalWaterEntry = {
          id: `optimistic-${generateLocalId()}`,
          amount_l: input.amount_l,
          logged_at: new Date().toISOString(),
        };
        return {
          ...day,
          dailyLog: { ...dailyLog, water_l: dailyLog.water_l + input.amount_l },
          waterEntries: [...day.waterEntries, entry],
        };
      },
      successMessage: 'Water logged.',
      failureMessage: "Couldn't log water.",
    }),
  );

  // Sleep lives directly on daily_logs (BACKEND_SCHEMA §4) — not a child table.
  queryClient.setMutationDefaults(
    KEYS.logSleep,
    createJournalMutationDefault<SleepEntryInput>({
      mutate: async (userId, input) => {
        const dailyLogId = await ensureTodayDailyLogId(userId);
        const { error } = await supabase
          .from('daily_logs')
          .update({ sleep_hours: input.sleep_hours, sleep_quality: input.sleep_quality ?? null })
          .eq('id', dailyLogId);
        if (error) throw error;
      },
      apply: (day, input) => ({
        ...day,
        dailyLog: withDailyLog(day, { sleep_hours: input.sleep_hours, sleep_quality: input.sleep_quality ?? null }),
      }),
      successMessage: 'Sleep logged.',
      failureMessage: "Couldn't log sleep.",
    }),
  );

  queryClient.setMutationDefaults(
    KEYS.logWorkout,
    createJournalMutationDefault<WorkoutEntryInput>({
      mutate: async (userId, input) => {
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
      apply: (day, input) => {
        const entry: JournalWorkoutEntry = {
          id: `optimistic-${generateLocalId()}`,
          workout_type: input.workout_type,
          duration_min: input.duration_min,
          calories_burned: input.calories_burned ?? null,
        };
        return { ...day, dailyLog: withDailyLog(day), workoutEntries: [...day.workoutEntries, entry] };
      },
      successMessage: 'Workout logged.',
      failureMessage: "Couldn't log workout.",
    }),
  );

  // Mood/energy/stress live directly on daily_logs (BACKEND_SCHEMA §4) — not
  // a child table.
  queryClient.setMutationDefaults(
    KEYS.logMood,
    createJournalMutationDefault<MoodEntryInput>({
      mutate: async (userId, input) => {
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
      apply: (day, input) => ({
        ...day,
        dailyLog: withDailyLog(day, {
          mood: input.mood,
          energy_level: input.energy_level ?? null,
          stress_level: input.stress_level ?? null,
        }),
      }),
      successMessage: 'Mood logged.',
      failureMessage: "Couldn't log mood.",
    }),
  );

  queryClient.setMutationDefaults(
    KEYS.logSymptom,
    createJournalMutationDefault<SymptomEntryInput>({
      mutate: async (userId, input) => {
        const dailyLogId = await ensureTodayDailyLogId(userId);
        const { error } = await supabase.from('symptom_entries').insert({
          user_id: userId,
          daily_log_id: dailyLogId,
          symptom: input.symptom,
          severity: input.severity ?? null,
        });
        if (error) throw error;
      },
      apply: (day, input) => {
        const entry: JournalSymptomEntry = {
          id: `optimistic-${generateLocalId()}`,
          symptom: input.symptom,
          severity: input.severity ?? null,
        };
        return { ...day, dailyLog: withDailyLog(day), symptomEntries: [...day.symptomEntries, entry] };
      },
      successMessage: 'Symptom logged.',
      failureMessage: "Couldn't log symptom.",
    }),
  );

  queryClient.setMutationDefaults(
    KEYS.logSupplement,
    createJournalMutationDefault<string>({
      mutate: async (userId, name) => {
        const dailyLogId = await ensureTodayDailyLogId(userId);
        const { error } = await supabase.from('supplement_entries').insert({
          user_id: userId,
          daily_log_id: dailyLogId,
          name,
        });
        if (error) throw error;
      },
      apply: (day, name) => {
        const entry: JournalSupplementEntry = { id: `optimistic-${generateLocalId()}`, name };
        return { ...day, dailyLog: withDailyLog(day), supplementEntries: [...day.supplementEntries, entry] };
      },
      successMessage: 'Supplement logged.',
      failureMessage: "Couldn't log supplement.",
    }),
  );

  // Water needs its own delete: the daily_logs.water_l running total must be
  // decremented by the deleted entry's amount, not just the log row removed.
  queryClient.setMutationDefaults(
    KEYS.deleteWaterEntry,
    createJournalMutationDefault<{ id: string; dailyLogId: string; amountL: number }>({
      mutate: async (_userId, input) => {
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
      apply: (day, input) => ({
        ...day,
        dailyLog: day.dailyLog ? { ...day.dailyLog, water_l: Math.max(0, day.dailyLog.water_l - input.amountL) } : null,
        waterEntries: removeById(day.waterEntries, input.id),
      }),
      successMessage: 'Entry removed.',
      failureMessage: "Couldn't remove entry.",
    }),
  );

  for (const table of DELETE_TABLES) {
    queryClient.setMutationDefaults(
      KEYS.deleteEntry(table),
      createJournalMutationDefault<string>({
        mutate: async (_userId, id) => {
          const { error } = await supabase.from(table).delete().eq('id', id);
          if (error) throw error;
        },
        apply: (day, id) => applyDelete(table, day, id),
        successMessage: 'Entry removed.',
        failureMessage: "Couldn't remove entry.",
      }),
    );
  }
}

export function useLogFoodFromDb() {
  return useMutation<void, Error, SelectedFoodInput, OptimisticContext>({ mutationKey: KEYS.logFoodFromDb });
}

export function useLogCustomFood() {
  return useMutation<void, Error, FoodCustomEntryInput, OptimisticContext>({ mutationKey: KEYS.logCustomFood });
}

export function useLogWater() {
  return useMutation<void, Error, WaterEntryInput, OptimisticContext>({ mutationKey: KEYS.logWater });
}

export function useLogSleep() {
  return useMutation<void, Error, SleepEntryInput, OptimisticContext>({ mutationKey: KEYS.logSleep });
}

export function useLogWorkout() {
  return useMutation<void, Error, WorkoutEntryInput, OptimisticContext>({ mutationKey: KEYS.logWorkout });
}

export function useLogMood() {
  return useMutation<void, Error, MoodEntryInput, OptimisticContext>({ mutationKey: KEYS.logMood });
}

export function useLogSymptom() {
  return useMutation<void, Error, SymptomEntryInput, OptimisticContext>({ mutationKey: KEYS.logSymptom });
}

export function useLogSupplement() {
  return useMutation<void, Error, string, OptimisticContext>({ mutationKey: KEYS.logSupplement });
}

export function useDeleteEntry(table: DeletableTable) {
  return useMutation<void, Error, string, OptimisticContext>({ mutationKey: KEYS.deleteEntry(table) });
}

export function useDeleteWaterEntry() {
  return useMutation<void, Error, { id: string; dailyLogId: string; amountL: number }, OptimisticContext>({
    mutationKey: KEYS.deleteWaterEntry,
  });
}
