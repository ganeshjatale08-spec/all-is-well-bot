// Streaks and badges — gamification arithmetic, kept here (not in the LLM
// or a DB trigger) per the same "client computes, pure functions" rule as
// the deterministic score (HARD RULE 2 / TRD §6).

export type StreakCounts = { current: number; best: number };

export function addDays(dateString: string, delta: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day + delta);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// dates: the calendar days (YYYY-MM-DD, any order/duplicates) an activity
// was logged on. today: the user's local "today". `current` walks backward
// from today, or from yesterday if today hasn't been logged yet — opening
// the app before logging anything shouldn't zero out an otherwise-live
// streak. `best` scans the full set for the longest historical run.
export function calculateStreak(dates: readonly string[], today: string): StreakCounts {
  const dateSet = new Set(dates);

  let cursor = dateSet.has(today) ? today : addDays(today, -1);
  let current = 0;
  while (dateSet.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  const sorted = [...dateSet].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const date of sorted) {
    run = prev !== null && addDays(prev, 1) === date ? run + 1 : 1;
    best = Math.max(best, run);
    prev = date;
  }

  return { current, best: Math.max(best, current) };
}

export type BadgeInput = {
  workoutCurrent: number;
  sleepCurrent: number;
  waterActualL: number;
  waterTargetL: number;
  proteinActualG: number;
  proteinTargetG: number;
  alreadyEarned: readonly string[];
};

// "Basic badges" (BACKEND_SCHEMA §6): the two streak-backed badges fire off
// the same 7-day window the streak flame uses; water/protein badges are a
// single-day milestone (no dedicated streak columns exist for them) awarded
// the first time that day's target is met.
const STREAK_BADGE_DAYS = 7;

export function evaluateNewBadges(input: BadgeInput): string[] {
  const earned = new Set(input.alreadyEarned);
  const newlyEarned: string[] = [];

  const maybeAward = (id: string, qualifies: boolean) => {
    if (qualifies && !earned.has(id)) newlyEarned.push(id);
  };

  maybeAward('fitness_warrior', input.workoutCurrent >= STREAK_BADGE_DAYS);
  maybeAward('sleep_hero', input.sleepCurrent >= STREAK_BADGE_DAYS);
  maybeAward('water_master', input.waterTargetL > 0 && input.waterActualL >= input.waterTargetL);
  maybeAward('protein_champion', input.proteinTargetG > 0 && input.proteinActualG >= input.proteinTargetG);

  return newlyEarned;
}
