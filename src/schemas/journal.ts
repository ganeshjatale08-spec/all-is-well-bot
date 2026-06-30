import { z } from 'zod';

import { MEAL_OPTIONS, MOOD_OPTIONS, WORKOUT_OPTIONS } from '../constants/enums';

// Mirrors food_entries (BACKEND_SCHEMA.md §4) for the custom-entry fallback
// in the food log modal ("Can't find it?"). Macros here are the total for
// what was eaten — servings is fixed at 1 for a custom entry.
export const foodCustomEntrySchema = z.object({
  meal: z.enum(MEAL_OPTIONS),
  custom_name: z.string().min(1, 'Name is required').max(120),
  kcal: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
});
export type FoodCustomEntryInput = z.infer<typeof foodCustomEntrySchema>;

export const waterEntrySchema = z.object({
  amount_l: z.number().positive('Add an amount'),
});
export type WaterEntryInput = z.infer<typeof waterEntrySchema>;

export const sleepEntrySchema = z.object({
  sleep_hours: z.number().min(0).max(24),
  sleep_quality: z.number().int().min(1).max(10).optional(),
});
export type SleepEntryInput = z.infer<typeof sleepEntrySchema>;

export const workoutEntrySchema = z.object({
  workout_type: z.enum(WORKOUT_OPTIONS),
  duration_min: z.number().int().positive('Add a duration'),
  calories_burned: z.number().int().nonnegative().optional(),
});
export type WorkoutEntryInput = z.infer<typeof workoutEntrySchema>;

export const moodEntrySchema = z.object({
  mood: z.enum(MOOD_OPTIONS),
  energy_level: z.number().int().min(1).max(10).optional(),
  stress_level: z.number().int().min(1).max(10).optional(),
});
export type MoodEntryInput = z.infer<typeof moodEntrySchema>;

export const symptomEntrySchema = z.object({
  symptom: z.string().min(1, 'Add a symptom').max(120),
  severity: z.number().int().min(1).max(10).optional(),
});
export type SymptomEntryInput = z.infer<typeof symptomEntrySchema>;
