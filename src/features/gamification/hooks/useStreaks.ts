import { useQuery } from '@tanstack/react-query';

import { addDays, calculateStreak, evaluateNewBadges } from '../../../domain/streaks';
import { supabase } from '../../../lib/supabase';
import { useToastStore } from '../../../lib/toast';
import { useSession } from '../../auth/SessionProvider';
import { todayDateString } from '../../journal/hooks/useDailyLog';

// Mirrors the badge rows seeded in 20260630000005_gamification.sql — used
// only for the earned-badge toast copy, not for award logic.
const BADGE_NAMES: Record<string, string> = {
  water_master: 'Water Master',
  protein_champion: 'Protein Champion',
  sleep_hero: 'Sleep Hero',
  fitness_warrior: 'Fitness Warrior',
};

// How far back to look when recomputing streaks from raw entries. Generous
// enough that no real streak gets truncated, small enough to keep the query cheap.
const HISTORY_DAYS = 120;

export type StreaksAndBadges = {
  checkinCurrent: number;
  checkinBest: number;
  workoutCurrent: number;
  sleepCurrent: number;
  earnedBadgeIds: string[];
};

export function streaksQueryKey(userId: string | undefined) {
  return ['streaks', userId, todayDateString()] as const;
}

export type StreaksInput = {
  waterActualL: number;
  waterTargetL: number;
  proteinActualG: number;
  proteinTargetG: number;
};

type DailyLogStreakRow = {
  log_date: string;
  sleep_hours: number | null;
  workout_entries: { id: string }[];
};

// Streaks/badges follow the same "client computes, pure functions in
// domain/" pattern as the deterministic score (HARD RULE 2, TRD §6):
// recompute from raw daily_logs/workout_entries here, then persist the
// result into streaks/user_badges via an owner-RLS upsert (BACKEND_SCHEMA
// §6, §10) so checkin_best survives beyond this history window.
export function useStreaksAndBadges(input: StreaksInput) {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: streaksQueryKey(userId),
    queryFn: async (): Promise<StreaksAndBadges> => {
      const today = todayDateString();
      const since = addDays(today, -HISTORY_DAYS);

      const [logsResult, persistedResult, badgesResult] = await Promise.all([
        supabase
          .from('daily_logs')
          .select('log_date, sleep_hours, workout_entries(id)')
          .eq('user_id', userId)
          .gte('log_date', since),
        supabase.from('streaks').select('checkin_best').eq('user_id', userId).maybeSingle(),
        supabase.from('user_badges').select('badge_id').eq('user_id', userId),
      ]);
      if (logsResult.error) throw logsResult.error;
      if (persistedResult.error) throw persistedResult.error;
      if (badgesResult.error) throw badgesResult.error;

      const rows = (logsResult.data ?? []) as unknown as DailyLogStreakRow[];
      const checkinDates = rows.map((row) => row.log_date);
      const sleepDates = rows.filter((row) => row.sleep_hours !== null).map((row) => row.log_date);
      const workoutDates = rows.filter((row) => row.workout_entries.length > 0).map((row) => row.log_date);

      const checkin = calculateStreak(checkinDates, today);
      const sleep = calculateStreak(sleepDates, today);
      const workout = calculateStreak(workoutDates, today);
      const checkinBest = Math.max(checkin.best, persistedResult.data?.checkin_best ?? 0);

      const { error: upsertError } = await supabase.from('streaks').upsert(
        {
          user_id: userId,
          checkin_current: checkin.current,
          checkin_best: checkinBest,
          workout_current: workout.current,
          sleep_current: sleep.current,
          last_checkin_date: today,
        },
        { onConflict: 'user_id' },
      );
      if (upsertError) throw upsertError;

      const alreadyEarned = (badgesResult.data ?? []).map((row) => row.badge_id as string);
      const newlyEarned = evaluateNewBadges({
        workoutCurrent: workout.current,
        sleepCurrent: sleep.current,
        waterActualL: input.waterActualL,
        waterTargetL: input.waterTargetL,
        proteinActualG: input.proteinActualG,
        proteinTargetG: input.proteinTargetG,
        alreadyEarned,
      });

      if (newlyEarned.length > 0) {
        // ignoreDuplicates guards a re-run racing the same award (e.g. two
        // invalidations in flight) against the (user_id, badge_id) PK.
        const { error: badgeError } = await supabase
          .from('user_badges')
          .upsert(
            newlyEarned.map((badge_id) => ({ user_id: userId, badge_id })),
            { onConflict: 'user_id,badge_id', ignoreDuplicates: true },
          );
        if (badgeError) throw badgeError;

        for (const badgeId of newlyEarned) {
          useToastStore.getState().show(`Badge earned: ${BADGE_NAMES[badgeId] ?? badgeId}`, 'success');
        }
      }

      return {
        checkinCurrent: checkin.current,
        checkinBest,
        workoutCurrent: workout.current,
        sleepCurrent: sleep.current,
        earnedBadgeIds: [...alreadyEarned, ...newlyEarned],
      };
    },
    enabled: !!userId,
  });
}
