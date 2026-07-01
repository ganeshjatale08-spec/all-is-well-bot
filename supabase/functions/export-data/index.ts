// export-data — returns all personal data for the authenticated user as JSON.
// DPDP Act, 2023: right to access personal data (TRD §10).
// The client receives the JSON and can share/save it via expo-sharing.
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient, getUserFromRequest } from '../_shared/supabaseAdmin.ts';

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'GET') {
    return jsonResponse({ error: 'method not allowed' }, 405);
  }

  const user = await getUserFromRequest(req);
  if (!user) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  const uid = user.id;
  const db = createServiceClient();

  // Fetch all tables in parallel — entry tables via nested select on daily_logs.
  const [
    profileRes,
    healthProfileRes,
    dailyLogsRes,
    aiAnalysesRes,
    weeklyReportsRes,
    monthlyReportsRes,
    goalsRes,
    streaksRes,
    subscriptionsRes,
  ] = await Promise.all([
    db.from('profiles').select('*').eq('id', uid).maybeSingle(),
    db.from('health_profiles').select('*').eq('user_id', uid).maybeSingle(),
    db
      .from('daily_logs')
      .select(
        '*, food_log_entries(*), water_log_entries(*), sleep_log_entries(*), movement_log_entries(*), mood_log_entries(*), symptom_log_entries(*)',
      )
      .eq('user_id', uid)
      .order('log_date', { ascending: false }),
    db.from('ai_analyses').select('*').eq('user_id', uid).order('analysis_date', { ascending: false }),
    db.from('weekly_reports').select('*').eq('user_id', uid).order('week_start', { ascending: false }),
    db.from('monthly_reports').select('*').eq('user_id', uid).order('month_start', { ascending: false }),
    db.from('goals').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    db.from('streaks').select('*').eq('user_id', uid).maybeSingle(),
    db.from('subscriptions').select('*').eq('user_id', uid).maybeSingle(),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user_id: uid,
    email: user.email,
    profile: profileRes.data,
    health_profile: healthProfileRes.data,
    daily_logs: dailyLogsRes.data ?? [],
    ai_analyses: aiAnalysesRes.data ?? [],
    weekly_reports: weeklyReportsRes.data ?? [],
    monthly_reports: monthlyReportsRes.data ?? [],
    goals: goalsRes.data ?? [],
    streak: streaksRes.data,
    subscription: subscriptionsRes.data,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="saathi-data-export.json"',
    },
  });
});
