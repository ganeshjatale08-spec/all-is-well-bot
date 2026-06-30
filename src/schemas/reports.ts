import { z } from 'zod';

// Mirrors the row shape returned by supabase/functions/weekly-report and
// monthly-report (and the `reports` table, BACKEND_SCHEMA.md §5) — same
// "schemas are the contract, mirror server-side" convention as
// schemas/aiAnalysis.ts. `summary` is discriminated by `period` since the two
// report types carry different facts (TRD §4.3/§6).
export const weeklyReportSummarySchema = z.object({
  weekly_score: z.number(),
  totals: z.object({
    steps: z.number(),
    workoutMinutes: z.number(),
    workoutCount: z.number(),
    sleepAvgHours: z.number(),
    waterAvgL: z.number(),
    proteinAvgG: z.number(),
  }),
  hit_rates: z.object({
    calorie: z.number(),
    protein: z.number(),
    water: z.number(),
    sleep: z.number(),
    activity: z.number(),
  }),
  best_day: z.object({ date: z.string(), score: z.number() }).nullable(),
  worst_day: z.object({ date: z.string(), score: z.number() }).nullable(),
  achievements: z.array(z.string()),
  improvement_areas: z.array(z.string()),
  narrative: z.string(),
});
export type WeeklyReportSummary = z.infer<typeof weeklyReportSummarySchema>;

export const monthlyReportSummarySchema = z.object({
  monthly_score: z.number(),
  score_trend: z.enum(['improving', 'steady', 'declining']),
  averages: z.object({
    sleepHours: z.number(),
    steps: z.number(),
    proteinG: z.number(),
    waterL: z.number(),
  }),
  current_weight_kg: z.number().nullable(),
  weight_change_kg: z.number().nullable(),
  insights: z.array(z.string()),
  narrative: z.string(),
});
export type MonthlyReportSummary = z.infer<typeof monthlyReportSummarySchema>;

const reportBaseSchema = z.object({
  id: z.string(),
  period_start: z.string(),
  period_end: z.string(),
  score: z.number().nullable(),
  pdf_url: z.string().nullable(),
  share_token: z.string().nullable(),
  model: z.string().nullable(),
  created_at: z.string(),
});

export const weeklyReportSchema = reportBaseSchema.extend({
  period: z.literal('weekly'),
  summary: weeklyReportSummarySchema,
});
export type WeeklyReport = z.infer<typeof weeklyReportSchema>;

export const monthlyReportSchema = reportBaseSchema.extend({
  period: z.literal('monthly'),
  summary: monthlyReportSummarySchema,
});
export type MonthlyReport = z.infer<typeof monthlyReportSchema>;

export const reportSchema = z.discriminatedUnion('period', [weeklyReportSchema, monthlyReportSchema]);
export type Report = z.infer<typeof reportSchema>;

// A list-row projection (no `summary` parse needed) for the Insights tab's
// report cards, which only show period/score/date — full `summary` is only
// parsed once the user opens report/[id].
export const reportListItemSchema = reportBaseSchema.extend({
  period: z.enum(['weekly', 'monthly']),
});
export type ReportListItem = z.infer<typeof reportListItemSchema>;
