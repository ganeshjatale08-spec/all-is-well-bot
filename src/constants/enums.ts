// Mirrors the Postgres enums in BACKEND_SCHEMA.md §1 — keep in sync with
// supabase/migrations. Source of truth for both zod schemas and form options.

export const SEX_OPTIONS = ['male', 'female', 'other'] as const;
export const DIET_OPTIONS = ['vegetarian', 'non_vegetarian', 'eggetarian', 'vegan', 'jain'] as const;
export const ACTIVITY_OPTIONS = [
  'sedentary',
  'lightly_active',
  'moderately_active',
  'very_active',
] as const;
export const WORK_OPTIONS = [
  'desk_job',
  'field_work',
  'shift_worker',
  'student',
  'business_owner',
] as const;
export const GOAL_OPTIONS = [
  'weight_loss',
  'weight_gain',
  'muscle_gain',
  'improve_sleep',
  'stress_reduction',
  'diabetes_management',
  'general_fitness',
] as const;
export const MEAL_OPTIONS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export const WORKOUT_OPTIONS = ['gym', 'running', 'walking', 'yoga', 'cycling', 'home_workout'] as const;
export const MOOD_OPTIONS = ['happy', 'normal', 'stressed', 'sad', 'angry'] as const;
export const PLAN_OPTIONS = ['free', 'pro', 'family', 'advanced'] as const;
