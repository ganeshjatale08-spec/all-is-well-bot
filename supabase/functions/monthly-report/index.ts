// monthly-report Edge Function (PROGRESS.md Phase 5, TRD §4.2/§4.3/§6):
// 1. authz: require Pro+ entitlement (HARD RULE 3)
// 2. idempotency: return the existing row for (user_id, 'monthly', period_start)
//    if present (HARD RULE 9)
// 3. bulk-recompute the month's daily scores/totals server-side, plus weight
//    progress vs the prior monthly report (HARD RULE 2)
// 4. call Gemini (2.5 Flash — TRD §4.3 tiers monthly above daily/weekly) with
//    responseSchema for narrative/insights only (HARD RULE 5)
// 5. safety post-check (HARD RULE 6) -> store -> log ai_usage -> return
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient, getUserFromRequest, isServiceRoleRequest } from '../_shared/supabaseAdmin.ts';
import { hasProEntitlement } from '../_shared/entitlement.ts';
import { calculateDailyTargets, type Sex, type ActivityLevel, type Goal } from '../_shared/domain.ts';
import { fetchDailyAggregates, buildMonthlyFacts } from '../_shared/reportAggregation.ts';
import { buildMonthlyUserPrompt, MONTHLY_REPORT_SYSTEM_PROMPT } from '../_shared/prompt.ts';
import { generateMonthlyReport, MONTHLY_REPORT_MODEL } from '../_shared/gemini.ts';
import { hasUnsafeContent } from '../_shared/safety.ts';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// TRD §4.3 verified pricing for gemini-2.5-flash, per 1M tokens.
const INPUT_PRICE_PER_M_USD = 0.3;
const OUTPUT_PRICE_PER_M_USD = 2.5;

function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * INPUT_PRICE_PER_M_USD + (outputTokens / 1_000_000) * OUTPUT_PRICE_PER_M_USD;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function monthStartFor(periodEnd: string): string {
  return `${periodEnd.slice(0, 7)}-01`;
}

function previousMonthStartFor(monthStart: string): string {
  const date = new Date(`${monthStart}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 10);
}

type MonthlySummary = {
  monthly_score: number;
  score_trend: string;
  averages: { sleepHours: number; steps: number; proteinG: number; waterL: number };
  current_weight_kg: number | null;
  weight_change_kg: number | null;
  insights: string[];
  narrative: string;
};

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405);
  }

  let body: { period_end?: unknown; user_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid JSON body' }, 400);
  }

  const periodEnd = body?.period_end;
  if (typeof periodEnd !== 'string' || !DATE_PATTERN.test(periodEnd)) {
    return jsonResponse({ error: 'period_end (YYYY-MM-DD, last day of the month) is required' }, 400);
  }
  const periodStart = monthStartFor(periodEnd);

  // Two auth modes, mirroring daily-analysis/weekly-report: a real user JWT
  // (on-demand from the Insights tab), or the service role key with an
  // explicit user_id (the month-end pg_cron batch).
  let userId: string;
  if (isServiceRoleRequest(req)) {
    if (typeof body.user_id !== 'string' || !UUID_PATTERN.test(body.user_id)) {
      return jsonResponse({ error: 'user_id is required for service-role calls' }, 400);
    }
    userId = body.user_id;
  } else {
    const user = await getUserFromRequest(req);
    if (!user) {
      return jsonResponse({ error: 'unauthorized' }, 401);
    }
    userId = user.id;
  }

  const supabase = createServiceClient();

  // 1. Entitlement gate.
  const entitled = await hasProEntitlement(supabase, userId);
  if (!entitled) {
    return jsonResponse({ error: 'pro entitlement required' }, 403);
  }

  // 2. Idempotency.
  const { data: existing, error: existingError } = await supabase
    .from('reports')
    .select('id, period, period_start, period_end, score, summary, pdf_url, share_token, model, created_at')
    .eq('user_id', userId)
    .eq('period', 'monthly')
    .eq('period_start', periodStart)
    .maybeSingle();
  if (existingError) {
    return jsonResponse({ error: existingError.message }, 500);
  }
  if (existing) {
    return jsonResponse(existing, 200);
  }

  // 3. Recompute the month's numbers server-side.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('age, sex, weight_kg, height_cm, activity_level, primary_goal')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) {
    return jsonResponse({ error: profileError.message }, 500);
  }
  if (
    !profile ||
    !profile.age ||
    !profile.sex ||
    !profile.weight_kg ||
    !profile.height_cm ||
    !profile.activity_level ||
    !profile.primary_goal
  ) {
    return jsonResponse({ error: 'profile incomplete' }, 400);
  }

  const targets = calculateDailyTargets({
    sex: profile.sex as Sex,
    weightKg: profile.weight_kg,
    heightCm: profile.height_cm,
    age: profile.age,
    activityLevel: profile.activity_level as ActivityLevel,
    goal: profile.primary_goal as Goal,
  });

  const days = await fetchDailyAggregates(supabase, userId, targets, periodStart, periodEnd);

  if (days.length === 0) {
    return jsonResponse({ skipped: true, reason: 'no_logs', period_start: periodStart, period_end: periodEnd }, 200);
  }

  // No dedicated weight-history table exists yet (BACKEND_SCHEMA has none),
  // so the prior monthly report's own summary doubles as last month's
  // weight/score snapshot — `reports` already gives a once-a-month time
  // series for free.
  const { data: previousReport } = await supabase
    .from('reports')
    .select('summary')
    .eq('user_id', userId)
    .eq('period', 'monthly')
    .eq('period_start', previousMonthStartFor(periodStart))
    .maybeSingle();
  const previousSummary = previousReport?.summary as MonthlySummary | undefined;

  const facts = buildMonthlyFacts(
    periodStart,
    periodEnd,
    days,
    profile.weight_kg,
    previousSummary?.monthly_score ?? null,
    previousSummary?.current_weight_kg ?? null,
  );

  // 4. Call Gemini with the recomputed facts — it narrates/selects, never computes.
  const userPrompt = buildMonthlyUserPrompt(facts);

  let generated;
  try {
    generated = await generateMonthlyReport(MONTHLY_REPORT_SYSTEM_PROMPT, userPrompt);
  } catch (err) {
    return jsonResponse({ error: `Gemini call failed: ${(err as Error).message}` }, 502);
  }

  // 5. Safety post-check, then store.
  const combined = `${generated.narrative} ${generated.insights.join(' ')}`;
  const safe = hasUnsafeContent(combined)
    ? { narrative: "Here's a look at your month — see the numbers below for the full picture.", insights: [] }
    : generated;

  const summary: MonthlySummary = {
    monthly_score: facts.monthlyScore,
    score_trend: facts.scoreTrend,
    averages: facts.averages,
    current_weight_kg: facts.currentWeightKg,
    weight_change_kg: facts.weightChangeKg,
    insights: safe.insights,
    narrative: safe.narrative,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('reports')
    .insert({
      user_id: userId,
      period: 'monthly',
      period_start: periodStart,
      period_end: periodEnd,
      score: facts.monthlyScore,
      summary,
      model: MONTHLY_REPORT_MODEL,
    })
    .select('id, period, period_start, period_end, score, summary, pdf_url, share_token, model, created_at')
    .single();

  if (insertError) {
    // 23505 = unique_violation on (user_id, period, period_start): a
    // concurrent call won the race. Return its row instead of erroring.
    if (insertError.code === '23505') {
      const { data: race } = await supabase
        .from('reports')
        .select('id, period, period_start, period_end, score, summary, pdf_url, share_token, model, created_at')
        .eq('user_id', userId)
        .eq('period', 'monthly')
        .eq('period_start', periodStart)
        .single();
      if (race) return jsonResponse(race, 200);
    }
    return jsonResponse({ error: insertError.message }, 500);
  }

  await supabase.from('ai_usage').insert({
    user_id: userId,
    function_name: 'monthly-report',
    model: MONTHLY_REPORT_MODEL,
    input_tokens: generated.inputTokens,
    output_tokens: generated.outputTokens,
    cost_usd: estimateCostUsd(generated.inputTokens, generated.outputTokens),
  });

  return jsonResponse(inserted, 200);
});
