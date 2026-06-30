import { sumMacros, sumMacrosByMeal } from '../nutrition';

describe('sumMacros', () => {
  it('returns zero totals for no entries', () => {
    expect(sumMacros([])).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });

  it('multiplies per-serving macros by servings and sums across entries', () => {
    const totals = sumMacros([
      { servings: 2, kcal: 100, proteinG: 5, carbsG: 10, fatG: 2 },
      { servings: 1.5, kcal: 50, proteinG: 2, carbsG: 8, fatG: 1 },
    ]);

    expect(totals).toEqual({
      kcal: 100 * 2 + 50 * 1.5,
      proteinG: 5 * 2 + 2 * 1.5,
      carbsG: 10 * 2 + 8 * 1.5,
      fatG: 2 * 2 + 1 * 1.5,
    });
  });
});

describe('sumMacrosByMeal', () => {
  it('groups totals by meal and zero-fills meals with no entries', () => {
    const totals = sumMacrosByMeal([
      { meal: 'breakfast', servings: 1, kcal: 100, proteinG: 5, carbsG: 10, fatG: 2 },
      { meal: 'breakfast', servings: 1, kcal: 50, proteinG: 2, carbsG: 8, fatG: 1 },
      { meal: 'dinner', servings: 2, kcal: 200, proteinG: 10, carbsG: 20, fatG: 5 },
    ]);

    expect(totals.breakfast).toEqual({ kcal: 150, proteinG: 7, carbsG: 18, fatG: 3 });
    expect(totals.dinner).toEqual({ kcal: 400, proteinG: 20, carbsG: 40, fatG: 10 });
    expect(totals.lunch).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
    expect(totals.snack).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });
});
