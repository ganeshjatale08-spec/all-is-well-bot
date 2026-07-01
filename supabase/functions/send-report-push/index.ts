// send-report-push — delivers an Expo Push notification when a weekly or
// monthly report is ready. Called by the weekly-report and monthly-report
// Edge Functions after writing the report row (server-to-server, no user JWT).
//
// Auth: service-role bearer token (same pattern as isServiceRoleRequest in
// supabaseAdmin.ts) — this function is never called from the client.
//
// Expo Push API reference: https://docs.expo.dev/push-notifications/sending-notifications/
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient, isServiceRoleRequest } from '../_shared/supabaseAdmin.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
}

async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`Expo Push API error ${res.status}: ${text}`);
  }
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

  if (!isServiceRoleRequest(req)) {
    return jsonResponse({ error: 'service role required' }, 401);
  }

  let body: { user_id?: unknown; report_id?: unknown; period?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid JSON' }, 400);
  }

  const userId = typeof body.user_id === 'string' ? body.user_id : null;
  const reportId = typeof body.report_id === 'string' ? body.report_id : null;
  const period = typeof body.period === 'string' ? body.period : 'weekly';

  if (!userId || !reportId) {
    return jsonResponse({ error: 'user_id and report_id are required' }, 400);
  }

  const supabase = createServiceClient();

  // Fetch all active Expo push tokens for this user.
  const { data: tokens, error: tokensError } = await supabase
    .from('device_tokens')
    .select('expo_token')
    .eq('user_id', userId);

  if (tokensError) {
    return jsonResponse({ error: tokensError.message }, 500);
  }
  if (!tokens || tokens.length === 0) {
    // No registered token — user hasn't granted push permission or just
    // unregistered. Acknowledge silently so the caller doesn't retry.
    return jsonResponse({ sent: 0 }, 200);
  }

  const isMonthly = period === 'monthly';
  const messages: PushMessage[] = tokens.map((t) => ({
    to: t.expo_token,
    title: isMonthly ? 'Your monthly report is ready' : 'Your week in review',
    body: isMonthly
      ? 'Tap to see your month at a glance — trends, insights, and next goals.'
      : 'Your weekly summary is ready. Tap to see how your week went.',
    sound: 'default',
    data: { type: 'report', report_id: reportId, period },
  }));

  await sendExpoPush(messages);

  return jsonResponse({ sent: messages.length }, 200);
});
