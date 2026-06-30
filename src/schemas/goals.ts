import { z } from 'zod';

// Mirrors the row shape returned by supabase/functions/goal-generator (and
// the `goals` table, BACKEND_SCHEMA.md §5). All numeric targets are
// formula-derived server-side (HARD RULE 2); `rationale` is the only
// LLM-authored part of this row.
export const monthlyGoalSchema = z.object({
  id: z.string(),
  month: z.string(),
  target_weight_kg: z.number().nullable(),
  daily_step_goal: z.number(),
  sleep_goal_hours: z.number(),
  water_goal_l: z.number(),
  protein_goal_g: z.number(),
  workout_goal_per_week: z.number(),
  sugar_reduction_note: z.string().nullable(),
  rationale: z.record(z.string(), z.string()).nullable(),
  created_at: z.string(),
});
export type MonthlyGoal = z.infer<typeof monthlyGoalSchema>;
