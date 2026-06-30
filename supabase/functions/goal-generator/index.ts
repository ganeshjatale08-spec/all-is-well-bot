// goal-generator Edge Function (PROGRESS.md Phase 5, TRD §4.2/§4.3/§6):
// "Month end -> monthly-report + goal-generator" (TRD §6). Mirrors
// monthly-report's structure but the numeric targets come straight from
// formulas (HARD RULE 2) — Gemini only writes a one-line rationale per
// target plus a sugar-reduction tip.
// 1. authz: require Pro+ entitlement (HARD RULE 3)
// 2. idempotency: return the existing row for (user_id, month) if present
//    (HARD RULE 9)
// 3. recompute last month's step/workout averages server-side, feed them
//    into the same conservative formulas as src/domain/goals.ts (HARD RULE 2)
// 4. call Gemini (2.5 Flash, same tier as monthly — TRD §4.3) with
//    responseSchema for rationale text only (HARD RULE 5)
// 5. safety post-check (HARD RULE 6) -> store -> log ai_usage -> return
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient, getUserFromRequest, isServiceRoleRequest } from '../_shared/supabaseAdmin.ts';
import { hasProEntitlement } from '../_shared/entitlement.ts';
import { calculateDailyTargets, calculateMonthlyGoals, type Sex, type ActivityLevel, type Goal } from '../_shared/domain.ts';
import { fetchDailyAggregates } from '../_shared/reportAggregation.ts';
import { buildGoalGeneratorUserPrompt, GOAL_GENERATOR_SYSTEM_PROMPT } from '../_shared/prompt.ts';
import { generateGoalRationale, GOAL_GENERATOR_MODEL } from '../_shared/gemini.ts';
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

function nextMonthStartFor(monthStart: string): string {
  const date = new Date(`${monthStart}T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().slice(0, 10);
}

function daysInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
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
    return jsonResponse({ error: 'period_end (YYYY-MM-DD, last day of the completed month) is required' }, 400);
  }
  const completedMonthStart = monthStartFor(periodEnd);
  const goalMonth = nextMonthStartFor(completedMonthStart);

  // Two auth modes, mirroring monthly-report: a real user JWT (on-demand
  // from the Insights tab), or the service role key with an explicit
  // user_id (the month-end pg_cron batch).
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
    .from('goals')
    .select('id, user_id, month, target_weight_kg, daily_step_goal, sleep_goal_hours, water_goal_l, protein_goal_g, workout_goal_per_week, sugar_reduction_note, rationale, created_at')
    .eq('user_id', userId)
    .eq('month', goalMonth)
    .maybeSingle();
  if (existingError) {
    return jsonResponse({ error: existingError.message }, 500);
  }
  if (existing) {
    return jsonResponse(existing, 200);
  }

  // 3. Recompute last month's pace server-side.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('age, sex, weight_kg, height_cm, activity_level, primary_goal, target_weight_kg')
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

  const days = await fetchDailyAggregates(supabase, userId, targets, completedMonthStart, periodEnd);

  // No logs last month -> fall back to baseline formulas (avgStepsLastMonth/
  // avgWorkoutsPerWeekLastMonth = null), since there's nothing to progress
  // from. Unlike weekly/monthly reports, goals are still worth generating
  // for a quiet month — they just start from defaults instead of a pace.
  const avgStepsLastMonth = days.length > 0 ? days.reduce((sum, day) => sum + day.steps, 0) / days.length : null;
  const avgWorkoutsPerWeekLastMonth =
    days.length > 0
      ? (days.filter((day) => day.workoutMinutes > 0).length / daysInclusive(completedMonthStart, periodEnd)) * 7
      : null;

  const monthlyGoals = calculateMonthlyGoals({
    weightKg: profile.weight_kg,
    age: profile.age,
    goal: profile.primary_goal as Goal,
    activityLevel: profile.activity_level as ActivityLevel,
    targetWeightKg: profile.target_weight_kg ?? null,
    avgStepsLastMonth,
    avgWorkoutsPerWeekLastMonth,
  });

  // 4. Call Gemini for the rationale text only — it frames/prioritizes,
  // never computes (HARD RULE 2).
  const userPrompt = buildGoalGeneratorUserPrompt(
    { primaryGoal: profile.primary_goal as Goal, activityLevel: profile.activity_level as ActivityLevel },
    monthlyGoals,
  );

  let generated;
  try {
    generated = await generateGoalRationale(GOAL_GENERATOR_SYSTEM_PROMPT, userPrompt);
  } catch (err) {
    return jsonResponse({ error: `Gemini call failed: ${(err as Error).message}` }, 502);
  }

  // 5. Safety post-check, then store.
  const combined = `${Object.values(generated.rationale).join(' ')} ${generated.sugar_reduction_note}`;
  const safe = hasUnsafeContent(combined)
    ? { rationale: {}, sugar_reduction_note: 'Swap one sugary drink or snack a day for a sugar-free option.' }
    : generated;

  const { data: inserted, error: insertError } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      month: goalMonth,
      target_weight_kg: monthlyGoals.targetWeightKg,
      daily_step_goal: monthlyGoals.dailyStepGoal,
      sleep_goal_hours: monthlyGoals.sleepGoalHours,
      water_goal_l: monthlyGoals.waterGoalL,
      protein_goal_g: monthlyGoals.proteinGoalG,
      workout_goal_per_week: monthlyGoals.workoutGoalPerWeek,
      sugar_reduction_note: safe.sugar_reduction_note,
      rationale: safe.rationale,
    })
    .select('id, user_id, month, target_weight_kg, daily_step_goal, sleep_goal_hours, water_goal_l, protein_goal_g, workout_goal_per_week, sugar_reduction_note, rationale, created_at')
    .single();

  if (insertError) {
    // 23505 = unique_violation on (user_id, month): a concurrent call won
    // the race. Return its row instead of erroring.
    if (insertError.code === '23505') {
      const { data: race } = await supabase
        .from('goals')
        .select('id, user_id, month, target_weight_kg, daily_step_goal, sleep_goal_hours, water_goal_l, protein_goal_g, workout_goal_per_week, sugar_reduction_note, rationale, created_at')
        .eq('user_id', userId)
        .eq('month', goalMonth)
        .single();
      if (race) return jsonResponse(race, 200);
    }
    return jsonResponse({ error: insertError.message }, 500);
  }

  await supabase.from('ai_usage').insert({
    user_id: userId,
    function_name: 'goal-generator',
    model: GOAL_GENERATOR_MODEL,
    input_tokens: generated.inputTokens,
    output_tokens: generated.outputTokens,
    cost_usd: estimateCostUsd(generated.inputTokens, generated.outputTokens),
  });

  return jsonResponse(inserted, 200);
});
