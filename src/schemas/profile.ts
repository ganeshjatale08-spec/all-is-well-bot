import { z } from 'zod';

import {
  ACTIVITY_OPTIONS,
  DIET_OPTIONS,
  GOAL_OPTIONS,
  SEX_OPTIONS,
  WORK_OPTIONS,
} from '../constants/enums';

// Mirrors `profiles` in BACKEND_SCHEMA.md §2. Required fields are Step 1
// basics (APP_FLOW.md §3); the rest is filled progressively.
export const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(120),
  age: z.number().int().min(13).max(120),
  sex: z.enum(SEX_OPTIONS),
  height_cm: z.number().positive(),
  weight_kg: z.number().positive(),
  target_weight_kg: z.number().positive().optional(),
  country: z.string().default('India'),
  state: z.string().optional(),
  city: z.string().optional(),
  occupation: z.string().optional(),
  diet_type: z.enum(DIET_OPTIONS).optional(),
  activity_level: z.enum(ACTIVITY_OPTIONS).optional(),
  work_type: z.enum(WORK_OPTIONS).optional(),
  primary_goal: z.enum(GOAL_OPTIONS),
  smoking: z.boolean().default(false),
  alcohol: z.boolean().default(false),
  avg_sleep_hours: z.number().positive().optional(),
  avg_water_l: z.number().positive().optional(),
  locale: z.string().default('en'),
});
export type ProfileInput = z.infer<typeof profileSchema>;

// Step 1 — Basics (required, APP_FLOW.md §3.3): the minimum needed to
// compute BMI/BMR/TDEE and unblock the Result screen.
export const profileBasicsSchema = profileSchema.pick({
  full_name: true,
  age: true,
  sex: true,
  height_cm: true,
  weight_kg: true,
  primary_goal: true,
});
export type ProfileBasicsInput = z.infer<typeof profileBasicsSchema>;

// Health profile (BACKEND_SCHEMA.md §2) — optional/sensitive, skippable Step 3.
export const healthProfileSchema = z.object({
  medical_conditions: z.array(z.string()).default([]),
  family_history: z.array(z.string()).default([]),
  food_allergies: z.array(z.string()).default([]),
  current_medications: z.string().optional(),
  daily_screen_time_hours: z.number().nonnegative().optional(),
  avg_stress_level: z.number().int().min(1).max(10).optional(),
  digestion_issues: z.boolean().optional(),
  chronic_pain: z.boolean().optional(),
  previous_injuries: z.string().optional(),
  daily_energy_level: z.number().int().min(1).max(10).optional(),
});
export type HealthProfileInput = z.infer<typeof healthProfileSchema>;
