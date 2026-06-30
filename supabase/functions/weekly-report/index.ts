// weekly-report Edge Function (PROGRESS.md Phase 5, TRD §4.2/§4.3/§6):
// 1. authz: require Pro+ entitlement (HARD RULE 3)
// 2. idempotency: return the existing row for (user_id, 'weekly', period_start)
//    if present (HARD RULE 9)
// 3. bulk-recompute the week's daily scores/totals server-side (HARD RULE 2)
//    — skip Gemini entirely if there's nothing to report on
// 4. call Gemini (Flash-Lite) with responseSchema for narrative/achievements/
//    improvement_areas only (HARD RULE 5)
// 5. safety post-check (HARD RULE 6) -> store -> log ai_usage -> return
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient, getUserFromRequest, isServiceRoleRequest } from '../_shared/supabaseAdmin.ts';
import { hasProEntitlement } from '../_shared/entitlement.ts';
import { calculateDailyTargets, type Sex, type ActivityLevel, type Goal } from '../_shared/domain.ts';
import { fetchDailyAggregates, buildWeeklyFacts } from '../_shared/reportAggregation.ts';
import { buildWeeklyUserPrompt, WEEKLY_REPORT_SYSTEM_PROMPT } from '../_shared/prompt.ts';
import { generateWeeklyReport, WEEKLY_REPORT_MODEL } from '../_shared/gemini.ts';
import { hasUnsafeContent } from '../_shared/safety.ts';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// TRD §4.3 verified pricing for gemini-2.5-flash-lite, per 1M tokens.
const INPUT_PRICE_PER_M_USD = 0.1;
const OUTPUT_PRICE_PER_M_USD = 0.4;

function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * INPUT_PRICE_PER_M_USD + (outputTokens / 1_000_000) * OUTPUT_PRICE_PER_M_USD;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Monday of the ISO week containing `periodEnd` (a Sunday in the cron path,
// but an on-demand client call can land mid-week — still resolve to that
// week's Monday so the report always covers a clean 7-day span).
function weekStartFor(periodEnd: string): string {
  const end = new Date(`${periodEnd}T00:00:00Z`);
  const isoDayOfWeek = end.getUTCDay() === 0 ? 7 : end.getUTCDay(); // 1=Mon..7=Sun
  end.setUTCDate(end.getUTCDate() - (isoDayOfWeek - 1));
  return end.toISOString().slice(0, 10);
}

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
    return jsonResponse({ error: 'period_end (YYYY-MM-DD) is required' }, 400);
  }
  const periodStart = weekStartFor(periodEnd);

  // Two auth modes, mirroring daily-analysis: a real user JWT (on-demand from
  // the Insights tab), or the service role key with an explicit user_id (the
  // Sunday-night pg_cron batch).
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
    .eq('period', 'weekly')
    .eq('period_start', periodStart)
    .maybeSingle();
  if (existingError) {
    return jsonResponse({ error: existingError.message }, 500);
  }
  if (existing) {
    return jsonResponse(existing, 200);
  }

  // 3. Recompute the week's numbers server-side.
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

  // Nothing logged this week — skip Gemini entirely rather than generate a
  // report about an empty week (HARD RULE 3's cost discipline applies here
  // too, not just to the Free tier).
  if (days.length === 0) {
    return jsonResponse({ skipped: true, reason: 'no_logs', period_start: periodStart, period_end: periodEnd }, 200);
  }

  const facts = buildWeeklyFacts(periodStart, periodEnd, days);

  // 4. Call Gemini with the recomputed facts — it narrates/selects, never computes.
  const userPrompt = buildWeeklyUserPrompt(facts);

  let generated;
  try {
    generated = await generateWeeklyReport(WEEKLY_REPORT_SYSTEM_PROMPT, userPrompt);
  } catch (err) {
    return jsonResponse({ error: `Gemini call failed: ${(err as Error).message}` }, 502);
  }

  // 5. Safety post-check, then store.
  const combined = `${generated.narrative} ${generated.achievements.join(' ')} ${generated.improvement_areas.join(' ')}`;
  const safe = hasUnsafeContent(combined)
    ? { narrative: "Here's a look at your week — see the numbers below for the full picture.", achievements: [], improvement_areas: [] }
    : generated;

  const summary = {
    weekly_score: facts.weeklyScore,
    totals: facts.totals,
    hit_rates: facts.hitRates,
    best_day: facts.bestDay,
    worst_day: facts.worstDay,
    achievements: safe.achievements,
    improvement_areas: safe.improvement_areas,
    narrative: safe.narrative,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('reports')
    .insert({
      user_id: userId,
      period: 'weekly',
      period_start: periodStart,
      period_end: periodEnd,
      score: facts.weeklyScore,
      summary,
      model: WEEKLY_REPORT_MODEL,
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
        .eq('period', 'weekly')
        .eq('period_start', periodStart)
        .single();
      if (race) return jsonResponse(race, 200);
    }
    return jsonResponse({ error: insertError.message }, 500);
  }

  await supabase.from('ai_usage').insert({
    user_id: userId,
    function_name: 'weekly-report',
    model: WEEKLY_REPORT_MODEL,
    input_tokens: generated.inputTokens,
    output_tokens: generated.outputTokens,
    cost_usd: estimateCostUsd(generated.inputTokens, generated.outputTokens),
  });

  return jsonResponse(inserted, 200);
});
