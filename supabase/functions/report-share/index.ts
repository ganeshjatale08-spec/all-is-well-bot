// report-share Edge Function (PROGRESS.md Phase 5 / BACKEND_SCHEMA §11):
// Generates a unique `share_token` for a monthly report and persists it to
// the `reports` row. No AI call. Auth: JWT only (share tokens are user-
// initiated — the cron batch has no reason to call this). Idempotent:
// returns the existing token if one is already set.
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient, getUserFromRequest } from '../_shared/supabaseAdmin.ts';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const user = await getUserFromRequest(req);
  if (!user) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  let body: { report_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid JSON body' }, 400);
  }

  if (typeof body.report_id !== 'string' || !UUID_PATTERN.test(body.report_id)) {
    return jsonResponse({ error: 'report_id (UUID) is required' }, 400);
  }

  const supabase = createServiceClient();

  // Verify the report exists and belongs to this user (ownership check —
  // HARD RULE 4: service role enforces ownership in code, not only via RLS).
  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('id, period, share_token')
    .eq('id', body.report_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (reportError) {
    return jsonResponse({ error: reportError.message }, 500);
  }
  if (!report) {
    return jsonResponse({ error: 'report not found' }, 404);
  }
  if (report.period !== 'monthly') {
    return jsonResponse({ error: 'share links are only available for monthly reports' }, 400);
  }

  // Idempotent — return existing token if set.
  if (report.share_token) {
    return jsonResponse({ share_token: report.share_token }, 200);
  }

  // Generate a new token and persist it.
  const { data: updated, error: updateError } = await supabase
    .from('reports')
    .update({ share_token: crypto.randomUUID() })
    .eq('id', report.id)
    .select('share_token')
    .single();
  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500);
  }

  return jsonResponse({ share_token: updated.share_token }, 200);
});
