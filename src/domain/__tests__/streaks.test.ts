import { calculateStreak, evaluateNewBadges } from '../streaks';

describe('calculateStreak', () => {
  it('returns zero for no dates', () => {
    expect(calculateStreak([], '2026-06-30')).toEqual({ current: 0, best: 0 });
  });

  it('counts a run ending today', () => {
    const dates = ['2026-06-28', '2026-06-29', '2026-06-30'];
    expect(calculateStreak(dates, '2026-06-30')).toEqual({ current: 3, best: 3 });
  });

  it('does not zero the current streak just because today is not logged yet', () => {
    const dates = ['2026-06-28', '2026-06-29'];
    expect(calculateStreak(dates, '2026-06-30')).toEqual({ current: 2, best: 2 });
  });

  it('resets current to zero once a day is missed', () => {
    const dates = ['2026-06-20', '2026-06-28'];
    expect(calculateStreak(dates, '2026-06-30')).toEqual({ current: 0, best: 1 });
  });

  it('tracks best as the longest historical run, even past a broken current streak', () => {
    const dates = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-29'];
    expect(calculateStreak(dates, '2026-06-30')).toEqual({ current: 1, best: 4 });
  });

  it('ignores duplicate and unordered entries', () => {
    const dates = ['2026-06-30', '2026-06-29', '2026-06-29', '2026-06-28'];
    expect(calculateStreak(dates, '2026-06-30')).toEqual({ current: 3, best: 3 });
  });
});

describe('evaluateNewBadges', () => {
  const base = {
    workoutCurrent: 0,
    sleepCurrent: 0,
    waterActualL: 0,
    waterTargetL: 2.5,
    proteinActualG: 0,
    proteinTargetG: 100,
    alreadyEarned: [] as string[],
  };

  it('awards nothing when no criteria are met', () => {
    expect(evaluateNewBadges(base)).toEqual([]);
  });

  it('awards fitness_warrior and sleep_hero at a 7-day streak', () => {
    expect(evaluateNewBadges({ ...base, workoutCurrent: 7, sleepCurrent: 7 })).toEqual(
      expect.arrayContaining(['fitness_warrior', 'sleep_hero']),
    );
  });

  it('does not award a streak badge below the threshold', () => {
    expect(evaluateNewBadges({ ...base, workoutCurrent: 6 })).toEqual([]);
  });

  it('awards water_master and protein_champion when today hits target', () => {
    expect(
      evaluateNewBadges({ ...base, waterActualL: 2.5, proteinActualG: 100 }),
    ).toEqual(expect.arrayContaining(['water_master', 'protein_champion']));
  });

  it('does not re-award an already-earned badge', () => {
    expect(
      evaluateNewBadges({ ...base, waterActualL: 3, alreadyEarned: ['water_master'] }),
    ).toEqual([]);
  });
});
