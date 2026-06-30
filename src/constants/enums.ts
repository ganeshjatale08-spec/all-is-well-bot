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

// Human-readable labels for enum values, used by OptionPicker fields.
export const SEX_LABELS: Record<(typeof SEX_OPTIONS)[number], string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

export const DIET_LABELS: Record<(typeof DIET_OPTIONS)[number], string> = {
  vegetarian: 'Vegetarian',
  non_vegetarian: 'Non-vegetarian',
  eggetarian: 'Eggetarian',
  vegan: 'Vegan',
  jain: 'Jain',
};

export const ACTIVITY_LABELS: Record<(typeof ACTIVITY_OPTIONS)[number], string> = {
  sedentary: 'Sedentary (little/no exercise)',
  lightly_active: 'Lightly active (1-3 days/week)',
  moderately_active: 'Moderately active (3-5 days/week)',
  very_active: 'Very active (6-7 days/week)',
};

export const GOAL_LABELS: Record<(typeof GOAL_OPTIONS)[number], string> = {
  weight_loss: 'Weight loss',
  weight_gain: 'Weight gain',
  muscle_gain: 'Muscle gain',
  improve_sleep: 'Improve sleep',
  stress_reduction: 'Stress reduction',
  diabetes_management: 'Diabetes management',
  general_fitness: 'General fitness',
};
