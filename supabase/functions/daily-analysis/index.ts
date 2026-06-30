// daily-analysis Edge Function (TRD §5 pseudocode, PROGRESS.md Phase 4):
// 1. authz: require Pro+ entitlement (HARD RULE 3 — Free triggers zero
//    Gemini calls)
// 2. idempotency: return the existing row for (user_id, log_date) if present
//    (HARD RULE 9 — never regenerate)
// 3. load profile + that day's log, recompute targets + deterministic score
//    server-side (HARD RULE 2 — never trust/ask the LLM for these numbers)
// 4. call Gemini (Flash-Lite) with responseSchema (HARD RULE 5)
// 5. safety post-check (HARD RULE 6) -> store -> log ai_usage -> return
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient, getUserFromRequest, isServiceRoleRequest } from '../_shared/supabaseAdmin.ts';
import { hasProEntitlement } from '../_shared/entitlement.ts';
import {
  calculateDailyTargets,
  calculateDailyScoreBreakdown,
  sumMacros,
  type Sex,
  type ActivityLevel,
  type Goal,
  type FoodEntryMacros,
} from '../_shared/domain.ts';
import { buildDailyUserPrompt, DAILY_ANALYSIS_SYSTEM_PROMPT } from '../_shared/prompt.ts';
import { generateDailyAnalysis, DAILY_ANALYSIS_MODEL } from '../_shared/gemini.ts';
import { hasRedFlagSymptoms, runSafetyPostCheck } from '../_shared/safety.ts';

const LOG_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// TRD §4.3/§4.4 verified pricing for gemini-2.5-flash-lite, per 1M tokens.
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

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'method not allowed' }, 405);
  }

  let body: { log_date?: unknown; user_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid JSON body' }, 400);
  }

  const logDate = body?.log_date;
  if (typeof logDate !== 'string' || !LOG_DATE_PATTERN.test(logDate)) {
    return jsonResponse({ error: 'log_date (YYYY-MM-DD) is required' }, 400);
  }

  // Two auth modes: a real user JWT (the client-invoked on-demand path), or
  // the service role key with an explicit user_id (the pg_cron overnight
  // batch — see supabaseAdmin.ts for why that's safe). Never trust a
  // client-supplied user_id outside the service-role path.
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

  // 1. Entitlement gate — before anything else, so Free never reaches the
  // queries below let alone Gemini.
  const entitled = await hasProEntitlement(supabase, userId);
  if (!entitled) {
    return jsonResponse({ error: 'pro entitlement required' }, 403);
  }

  // 2. Idempotency — never re-spend on an existing (user_id, log_date).
  const { data: existing, error: existingError } = await supabase
    .from('ai_analyses')
    .select('id, log_date, health_score, headline, insight, recommendation, tomorrow_focus, model, created_at')
    .eq('user_id', userId)
    .eq('log_date', logDate)
    .maybeSingle();
  if (existingError) {
    return jsonResponse({ error: existingError.message }, 500);
  }
  if (existing) {
    return jsonResponse(existing, 200);
  }

  // 3. Load profile + that day's log and recompute targets/score server-side.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('age, sex, weight_kg, height_cm, activity_level, primary_goal, diet_type')
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

  const { data: dailyLog, error: logError } = await supabase
    .from('daily_logs')
    .select('id, steps, sleep_hours, water_l, mood')
    .eq('user_id', userId)
    .eq('log_date', logDate)
    .maybeSingle();
  if (logError) {
    return jsonResponse({ error: logError.message }, 500);
  }
  if (!dailyLog) {
    return jsonResponse({ error: 'no log for that date' }, 400);
  }

  const [foodResult, workoutResult, symptomResult] = await Promise.all([
    supabase.from('food_entries').select('servings, kcal, protein_g, carbs_g, fat_g').eq('daily_log_id', dailyLog.id),
    supabase.from('workout_entries').select('duration_min').eq('daily_log_id', dailyLog.id),
    supabase.from('symptom_entries').select('symptom, severity').eq('daily_log_id', dailyLog.id),
  ]);
  if (foodResult.error) return jsonResponse({ error: foodResult.error.message }, 500);
  if (workoutResult.error) return jsonResponse({ error: workoutResult.error.message }, 500);
  if (symptomResult.error) return jsonResponse({ error: symptomResult.error.message }, 500);

  const macroEntries: FoodEntryMacros[] = (foodResult.data ?? []).map((row) => ({
    servings: row.servings,
    kcal: row.kcal,
    proteinG: row.protein_g,
    carbsG: row.carbs_g,
    fatG: row.fat_g,
  }));
  const macros = sumMacros(macroEntries);
  const workoutMinutes = (workoutResult.data ?? []).reduce((sum, row) => sum + row.duration_min, 0);
  const symptoms = symptomResult.data ?? [];

  const targets = calculateDailyTargets({
    sex: profile.sex as Sex,
    weightKg: profile.weight_kg,
    heightCm: profile.height_cm,
    age: profile.age,
    activityLevel: profile.activity_level as ActivityLevel,
    goal: profile.primary_goal as Goal,
  });

  const breakdown = calculateDailyScoreBreakdown({
    actualCalorieKcal: macros.kcal,
    calorieTargetKcal: targets.calorieTargetKcal,
    actualProteinG: macros.proteinG,
    proteinTargetG: targets.proteinTargetG,
    actualWaterL: dailyLog.water_l ?? 0,
    waterTargetL: targets.waterTargetL,
    actualSleepHours: dailyLog.sleep_hours ?? 0,
    sleepTargetHours: targets.sleepTargetHours,
    steps: dailyLog.steps ?? 0,
    workoutMinutes,
    symptomSeverities: symptoms.map((s) => s.severity).filter((v): v is number => v !== null),
  });

  const redFlag = hasRedFlagSymptoms(symptoms);

  // 4. Call Gemini with the recomputed numbers — it narrates, never computes.
  const userPrompt = buildDailyUserPrompt({
    profile: {
      age: profile.age,
      sex: profile.sex as Sex,
      dietType: profile.diet_type,
      primaryGoal: profile.primary_goal as Goal,
      activityLevel: profile.activity_level as ActivityLevel,
    },
    targets,
    today: {
      kcal: macros.kcal,
      proteinG: macros.proteinG,
      waterL: dailyLog.water_l ?? 0,
      sleepHours: dailyLog.sleep_hours,
      steps: dailyLog.steps ?? 0,
      workoutMinutes,
      mood: dailyLog.mood,
      symptoms,
    },
    scoreTotal: breakdown.total,
    hasRedFlagSymptom: redFlag,
  });

  let generated;
  try {
    generated = await generateDailyAnalysis(DAILY_ANALYSIS_SYSTEM_PROMPT, userPrompt);
  } catch (err) {
    return jsonResponse({ error: `Gemini call failed: ${(err as Error).message}` }, 502);
  }

  // 5. Safety post-check, then store (HARD RULE 2: health_score comes from
  // the server-side breakdown, never from the model).
  const safe = runSafetyPostCheck(
    {
      headline: generated.headline,
      insight: generated.insight,
      recommendation: generated.recommendation,
      tomorrow_focus: generated.tomorrow_focus,
    },
    redFlag,
  );

  const { data: inserted, error: insertError } = await supabase
    .from('ai_analyses')
    .insert({
      user_id: userId,
      log_date: logDate,
      health_score: breakdown.total,
      headline: safe.headline,
      insight: safe.insight,
      recommendation: safe.recommendation,
      tomorrow_focus: safe.tomorrow_focus,
      model: DAILY_ANALYSIS_MODEL,
    })
    .select('id, log_date, health_score, headline, insight, recommendation, tomorrow_focus, model, created_at')
    .single();

  if (insertError) {
    // 23505 = unique_violation on (user_id, log_date): a concurrent call won
    // the race. Return its row instead of erroring (still idempotent).
    if (insertError.code === '23505') {
      const { data: race } = await supabase
        .from('ai_analyses')
        .select('id, log_date, health_score, headline, insight, recommendation, tomorrow_focus, model, created_at')
        .eq('user_id', userId)
        .eq('log_date', logDate)
        .single();
      if (race) return jsonResponse(race, 200);
    }
    return jsonResponse({ error: insertError.message }, 500);
  }

  await supabase.from('ai_usage').insert({
    user_id: userId,
    function_name: 'daily-analysis',
    model: DAILY_ANALYSIS_MODEL,
    input_tokens: generated.inputTokens,
    output_tokens: generated.outputTokens,
    cost_usd: estimateCostUsd(generated.inputTokens, generated.outputTokens),
  });

  return jsonResponse(inserted, 200);
});
