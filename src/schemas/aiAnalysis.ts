import { z } from 'zod';

// Mirrors the row shape returned by supabase/functions/daily-analysis
// (and the `ai_analyses` table, BACKEND_SCHEMA.md §5) — the "schemas are
// the contract for forms and Edge Function I/O, mirror server-side"
// convention (CLAUDE.md Conventions), applied to AI response validation
// instead of a form this time.
export const aiAnalysisSchema = z.object({
  id: z.string(),
  log_date: z.string(),
  health_score: z.number().nullable(),
  headline: z.string().nullable(),
  insight: z.string().nullable(),
  recommendation: z.string().nullable(),
  tomorrow_focus: z.string().nullable(),
  model: z.string().nullable(),
  created_at: z.string(),
});
export type AiAnalysis = z.infer<typeof aiAnalysisSchema>;
