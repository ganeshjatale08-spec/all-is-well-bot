import {
  calculateDailyStepGoal,
  calculateMonthlyGoals,
  calculateMonthlyTargetWeightKg,
  calculateWorkoutGoalPerWeek,
} from '../goals';

describe('calculateMonthlyTargetWeightKg', () => {
  it('returns null when the user has no stated target', () => {
    expect(calculateMonthlyTargetWeightKg('weight_loss', 80, null)).toBeNull();
  });

  it('steps down by the safe monthly amount for weight_loss', () => {
    expect(calculateMonthlyTargetWeightKg('weight_loss', 80, 70)).toBe(78);
  });

  it('never overshoots the user target for weight_loss', () => {
    expect(calculateMonthlyTargetWeightKg('weight_loss', 71, 70)).toBe(70);
  });

  it('steps up by the safe monthly amount for weight_gain/muscle_gain', () => {
    expect(calculateMonthlyTargetWeightKg('weight_gain', 60, 70)).toBe(61.5);
    expect(calculateMonthlyTargetWeightKg('muscle_gain', 60, 70)).toBe(61.5);
  });

  it('never overshoots the user target for weight_gain', () => {
    expect(calculateMonthlyTargetWeightKg('weight_gain', 69, 70)).toBe(70);
  });

  it('targets the stated weight directly for non-weight goals', () => {
    expect(calculateMonthlyTargetWeightKg('general_fitness', 80, 75)).toBe(75);
  });
});

describe('calculateDailyStepGoal', () => {
  it('falls back to the 8000 default with no history', () => {
    expect(calculateDailyStepGoal(null)).toBe(8000);
    expect(calculateDailyStepGoal(0)).toBe(8000);
  });

  it('progresses 10% above last month, rounded to the nearest 500', () => {
    expect(calculateDailyStepGoal(9000)).toBe(10000);
  });

  it('never drops below the 6000 floor', () => {
    expect(calculateDailyStepGoal(1000)).toBe(6000);
  });

  it('never exceeds the 15000 ceiling', () => {
    expect(calculateDailyStepGoal(20000)).toBe(15000);
  });
});

describe('calculateWorkoutGoalPerWeek', () => {
  it('uses the activity-level baseline with no history', () => {
    expect(calculateWorkoutGoalPerWeek('sedentary', null)).toBe(2);
    expect(calculateWorkoutGoalPerWeek('very_active', null)).toBe(5);
  });

  it('holds at baseline when last month is below it', () => {
    expect(calculateWorkoutGoalPerWeek('moderately_active', 1)).toBe(4);
  });

  it('adds one session of stretch when already at or above baseline', () => {
    expect(calculateWorkoutGoalPerWeek('moderately_active', 4)).toBe(5);
  });

  it('never exceeds the 6/week ceiling', () => {
    expect(calculateWorkoutGoalPerWeek('very_active', 6)).toBe(6);
  });
});

describe('calculateMonthlyGoals', () => {
  it('combines all formula-derived targets', () => {
    const goals = calculateMonthlyGoals({
      weightKg: 80,
      age: 30,
      goal: 'weight_loss',
      activityLevel: 'moderately_active',
      targetWeightKg: 70,
      avgStepsLastMonth: 9000,
      avgWorkoutsPerWeekLastMonth: 3,
    });

    expect(goals.targetWeightKg).toBe(78);
    expect(goals.dailyStepGoal).toBe(10000);
    expect(goals.sleepGoalHours).toBe(8);
    expect(goals.waterGoalL).toBeCloseTo(2.8, 5);
    expect(goals.proteinGoalG).toBe(Math.round(80 * 1.6));
    expect(goals.workoutGoalPerWeek).toBe(4);
  });
});
