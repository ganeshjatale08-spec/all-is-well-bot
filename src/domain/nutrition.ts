import type { MEAL_OPTIONS } from '../constants/enums';

// Pure macro summing (TRD §3, §4) — no UI/network imports.
// food_entries store macros as a per-serving snapshot (BACKEND_SCHEMA.md §4);
// totals are that snapshot multiplied by the logged `servings` count.

export type Meal = (typeof MEAL_OPTIONS)[number];

export type FoodEntryMacros = {
  servings: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type MacroTotals = {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

const EMPTY_TOTALS: MacroTotals = { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 };

export function sumMacros(entries: readonly FoodEntryMacros[]): MacroTotals {
  return entries.reduce(
    (totals, entry) => ({
      kcal: totals.kcal + entry.kcal * entry.servings,
      proteinG: totals.proteinG + entry.proteinG * entry.servings,
      carbsG: totals.carbsG + entry.carbsG * entry.servings,
      fatG: totals.fatG + entry.fatG * entry.servings,
    }),
    EMPTY_TOTALS,
  );
}

export type MealFoodEntryMacros = FoodEntryMacros & { meal: Meal };

export function sumMacrosByMeal(
  entries: readonly MealFoodEntryMacros[],
): Record<Meal, MacroTotals> {
  const totals: Record<Meal, MacroTotals> = {
    breakfast: { ...EMPTY_TOTALS },
    lunch: { ...EMPTY_TOTALS },
    dinner: { ...EMPTY_TOTALS },
    snack: { ...EMPTY_TOTALS },
  };

  for (const entry of entries) {
    const mealTotal = totals[entry.meal];
    mealTotal.kcal += entry.kcal * entry.servings;
    mealTotal.proteinG += entry.proteinG * entry.servings;
    mealTotal.carbsG += entry.carbsG * entry.servings;
    mealTotal.fatG += entry.fatG * entry.servings;
  }

  return totals;
}
