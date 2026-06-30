import { calculateDailyScore, calculateSymptomPenalty } from '../scoring';

const PERFECT_DAY = {
  actualCalorieKcal: 2000,
  calorieTargetKcal: 2000,
  actualProteinG: 100,
  proteinTargetG: 100,
  actualWaterL: 3,
  waterTargetL: 3,
  actualSleepHours: 8,
  sleepTargetHours: 8,
  steps: 8000,
  workoutMinutes: 0,
  symptomSeverities: [],
};

describe('calculateDailyScore', () => {
  it('scores a perfect day at 100', () => {
    expect(calculateDailyScore(PERFECT_DAY)).toBe(100);
  });

  it('scores an empty/unlogged day at 0', () => {
    expect(
      calculateDailyScore({
        actualCalorieKcal: 0,
        calorieTargetKcal: 2000,
        actualProteinG: 0,
        proteinTargetG: 100,
        actualWaterL: 0,
        waterTargetL: 3,
        actualSleepHours: 0,
        sleepTargetHours: 8,
        steps: 0,
        workoutMinutes: 0,
        symptomSeverities: [],
      }),
    ).toBe(0);
  });

  it('treats meeting protein/water/activity targets as full marks even when exceeded', () => {
    expect(
      calculateDailyScore({
        ...PERFECT_DAY,
        actualProteinG: 200,
        actualWaterL: 5,
        steps: 20000,
      }),
    ).toBe(100);
  });

  it('penalizes calories overshooting the target, not just undershooting', () => {
    const under = calculateDailyScore({ ...PERFECT_DAY, actualCalorieKcal: 1000 });
    const over = calculateDailyScore({ ...PERFECT_DAY, actualCalorieKcal: 3000 });
    expect(under).toBeLessThan(100);
    expect(over).toBeLessThan(100);
  });

  it('credits activity from either steps or workout minutes, whichever is better', () => {
    const stepsOnly = calculateDailyScore({ ...PERFECT_DAY, steps: 8000, workoutMinutes: 0 });
    const workoutOnly = calculateDailyScore({ ...PERFECT_DAY, steps: 0, workoutMinutes: 30 });
    expect(stepsOnly).toBe(100);
    expect(workoutOnly).toBe(100);
  });

  it('applies a symptom penalty on top of an otherwise perfect day', () => {
    const score = calculateDailyScore({ ...PERFECT_DAY, symptomSeverities: [5] });
    expect(score).toBe(100 - 5 * 2);
  });

  it('never returns a negative score even with heavy symptom penalties', () => {
    const score = calculateDailyScore({
      actualCalorieKcal: 0,
      calorieTargetKcal: 2000,
      actualProteinG: 0,
      proteinTargetG: 100,
      actualWaterL: 0,
      waterTargetL: 3,
      actualSleepHours: 0,
      sleepTargetHours: 8,
      steps: 0,
      workoutMinutes: 0,
      symptomSeverities: [10, 10, 10],
    });
    expect(score).toBe(0);
  });

  it('falls back to default activity targets when none are supplied', () => {
    const withDefault = calculateDailyScore({ ...PERFECT_DAY, steps: 8000 });
    const withExplicit = calculateDailyScore({
      ...PERFECT_DAY,
      steps: 8000,
      stepsTarget: 8000,
    });
    expect(withDefault).toBe(withExplicit);
  });
});

describe('calculateSymptomPenalty', () => {
  it('returns 0 for no symptoms', () => {
    expect(calculateSymptomPenalty([])).toBe(0);
  });

  it('sums severity * 2 across symptoms', () => {
    expect(calculateSymptomPenalty([3, 4])).toBe((3 + 4) * 2);
  });

  it('caps the penalty at 30', () => {
    expect(calculateSymptomPenalty([10, 10, 10])).toBe(30);
  });
});
