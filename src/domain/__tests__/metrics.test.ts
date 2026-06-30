import {
  calculateBmi,
  calculateBmr,
  calculateCalorieTarget,
  calculateDailyTargets,
  calculateIdealWeightRange,
  calculateProteinTargetG,
  calculateSleepTargetHours,
  calculateTdee,
  calculateWaterTargetL,
  categorizeBmi,
} from '../metrics';

describe('calculateBmi', () => {
  it('computes kg / m^2', () => {
    expect(calculateBmi(70, 175)).toBeCloseTo(22.857, 3);
  });
});

describe('categorizeBmi', () => {
  it.each([
    [18.4, 'underweight'],
    [18.5, 'normal'],
    [24.9, 'normal'],
    [25, 'overweight'],
    [29.9, 'overweight'],
    [30, 'obese'],
  ] as const)('categorizes %f as %s', (bmi, category) => {
    expect(categorizeBmi(bmi)).toBe(category);
  });
});

describe('calculateBmr', () => {
  it('uses the male Mifflin-St Jeor constant', () => {
    expect(calculateBmr('male', 70, 175, 30)).toBeCloseTo(10 * 70 + 6.25 * 175 - 5 * 30 + 5, 5);
  });

  it('uses the female Mifflin-St Jeor constant', () => {
    expect(calculateBmr('female', 60, 165, 28)).toBeCloseTo(
      10 * 60 + 6.25 * 165 - 5 * 28 - 161,
      5,
    );
  });

  it('uses the midpoint constant for "other"', () => {
    const base = 10 * 65 + 6.25 * 170 - 5 * 25;
    expect(calculateBmr('other', 65, 170, 25)).toBeCloseTo(base + (5 + -161) / 2, 5);
  });
});

describe('calculateTdee', () => {
  it.each([
    ['sedentary', 1.2],
    ['lightly_active', 1.375],
    ['moderately_active', 1.55],
    ['very_active', 1.725],
  ] as const)('applies the %s activity factor', (level, factor) => {
    expect(calculateTdee(1500, level)).toBeCloseTo(1500 * factor, 5);
  });
});

describe('calculateIdealWeightRange', () => {
  it('derives the range from BMI 18.5-24.9 at the given height', () => {
    const heightM = 1.75;
    const range = calculateIdealWeightRange(175);
    expect(range.minKg).toBeCloseTo(18.5 * heightM * heightM, 5);
    expect(range.maxKg).toBeCloseTo(25 * heightM * heightM, 5);
  });
});

describe('calculateCalorieTarget', () => {
  it.each([
    ['weight_loss', -500],
    ['weight_gain', 500],
    ['muscle_gain', 300],
    ['general_fitness', 0],
  ] as const)('adjusts TDEE by the %s amount', (goal, delta) => {
    expect(calculateCalorieTarget(2000, goal)).toBe(2000 + delta);
  });

  it('never drops below the 1200 kcal floor', () => {
    expect(calculateCalorieTarget(1000, 'weight_loss')).toBe(1200);
  });
});

describe('calculateProteinTargetG', () => {
  it.each([
    ['muscle_gain', 1.8],
    ['weight_loss', 1.6],
    ['weight_gain', 1.6],
    ['general_fitness', 1.0],
  ] as const)('uses %s g/kg for %s', (goal, gPerKg) => {
    expect(calculateProteinTargetG(70, goal)).toBeCloseTo(70 * gPerKg, 5);
  });
});

describe('calculateWaterTargetL', () => {
  it('uses 35ml per kg', () => {
    expect(calculateWaterTargetL(80)).toBeCloseTo(2.8, 5);
  });

  it('never drops below the 2L floor', () => {
    expect(calculateWaterTargetL(40)).toBe(2.0);
  });
});

describe('calculateSleepTargetHours', () => {
  it.each([
    [13, 9],
    [17, 9],
    [18, 8],
    [64, 8],
    [65, 7.5],
    [90, 7.5],
  ])('targets %i hours for age %i', (age, hours) => {
    expect(calculateSleepTargetHours(age)).toBe(hours);
  });
});

describe('calculateDailyTargets', () => {
  it('combines BMR/TDEE into all four targets', () => {
    const targets = calculateDailyTargets({
      sex: 'male',
      weightKg: 70,
      heightCm: 175,
      age: 30,
      activityLevel: 'moderately_active',
      goal: 'weight_loss',
    });

    const expectedBmr = 10 * 70 + 6.25 * 175 - 5 * 30 + 5;
    const expectedTdee = expectedBmr * 1.55;

    expect(targets.calorieTargetKcal).toBeCloseTo(expectedTdee - 500, 5);
    expect(targets.proteinTargetG).toBeCloseTo(70 * 1.6, 5);
    expect(targets.waterTargetL).toBeCloseTo(2.45, 5);
    expect(targets.sleepTargetHours).toBe(8);
  });
});
