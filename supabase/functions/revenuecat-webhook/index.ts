// revenuecat-webhook — receives RevenueCat server-to-server events and keeps
// the `subscriptions` table in sync. Auth: Bearer token header whose value
// must match REVENUECAT_WEBHOOK_SECRET (set in RevenueCat dashboard under
// Project Settings → Webhooks → Authorization header). No user JWT involved.
//
// app_user_id in RevenueCat == auth.users.id in Supabase because the client
// calls Purchases.logIn(supabaseUserId) after sign-in (lib/revenuecat.ts).
//
// RevenueCat event docs:
//   https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabaseAdmin.ts';

// RevenueCat entitlement id → DB plan name.
// Configure the 'pro' entitlement in your RevenueCat project dashboard.
// Family/Advanced are schema-ready but not purchasable in MVP (PRD §5).
const ENTITLEMENT_TO_PLAN: Record<string, 'pro' | 'family' | 'advanced'> = {
  pro: 'pro',
  family: 'family',
  advanced: 'advanced',
};

type SubStatus = 'active' | 'trialing' | 'grace' | 'expired' | 'cancelled';

// Derive status from event type + period data rather than mapping every event
// type individually — avoids bugs when RevenueCat adds new event types.
function deriveStatus(eventType: string, periodType: string | null, expirationAtMs: number | null): SubStatus {
  if (eventType === 'BILLING_ISSUE') return 'grace';
  if (eventType === 'EXPIRATION') return 'expired';
  if (expirationAtMs != null && expirationAtMs <= Date.now()) return 'expired';
  if (periodType === 'TRIAL') return 'trialing';
  return 'active';
}

// Detect annual plan from product_id naming convention: ids containing
// 'annual' or 'yearly' are treated as annual. The operator must name
// App Store / Play Console products accordingly (e.g. 'pro_annual',
// 'pro_yearly') — documented in PROGRESS.md Phase 6 notes.
function isAnnual(productId: string | null): boolean {
  if (!productId) return false;
  const lower = productId.toLowerCase();
  return lower.includes('annual') || lower.includes('yearly');
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

  // Verify the shared webhook secret (set in RevenueCat dashboard as the
  // Authorization header value for this webhook endpoint).
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  const authHeader = req.headers.get('Authorization');
  if (!secret || !authHeader) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }
  // Support both raw token or "Bearer <token>" format.
  const incomingToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : authHeader;
  if (incomingToken !== secret) {
    return jsonResponse({ error: 'unauthorized' }, 401);
  }

  let payload: { event?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid JSON' }, 400);
  }

  const event = payload.event;
  if (!event || typeof event !== 'object') {
    return jsonResponse({ error: 'missing event' }, 400);
  }

  const eventType = typeof event.type === 'string' ? event.type : null;
  const appUserId = typeof event.app_user_id === 'string' ? event.app_user_id : null;

  if (!eventType || !appUserId) {
    return jsonResponse({ error: 'missing event.type or app_user_id' }, 400);
  }

  // Events that require no subscription row change (analytics, transfers, etc.)
  const SKIP_TYPES = new Set(['TEST', 'TRANSFER', 'SUBSCRIPTION_PAUSED', 'INVOICE_ISSUANCE']);
  if (SKIP_TYPES.has(eventType)) {
    return jsonResponse({ received: true }, 200);
  }

  const entitlementIds: string[] = Array.isArray(event.entitlement_ids)
    ? (event.entitlement_ids as unknown[]).filter((v): v is string => typeof v === 'string')
    : [];

  // Map RC entitlement(s) to our plan — pick the highest-tier matching one.
  const PLAN_ORDER: Record<string, number> = { pro: 1, family: 2, advanced: 3 };
  let plan: 'pro' | 'family' | 'advanced' | null = null;
  for (const eid of entitlementIds) {
    const mapped = ENTITLEMENT_TO_PLAN[eid];
    if (mapped && (plan === null || (PLAN_ORDER[mapped] ?? 0) > (PLAN_ORDER[plan] ?? 0))) {
      plan = mapped;
    }
  }

  // No recognised entitlement — acknowledge but skip upsert.
  if (!plan) {
    return jsonResponse({ received: true, skipped: 'unknown entitlement' }, 200);
  }

  const periodType = typeof event.period_type === 'string' ? event.period_type : null;
  const expirationAtMs = typeof event.expiration_at_ms === 'number' ? event.expiration_at_ms : null;
  const productId = typeof event.product_id === 'string' ? event.product_id : null;

  const status = deriveStatus(eventType, periodType, expirationAtMs);
  const currentPeriodEnd = expirationAtMs ? new Date(expirationAtMs).toISOString() : null;

  const supabase = createServiceClient();

  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: appUserId,
        plan,
        status,
        rc_app_user_id: appUserId,
        current_period_end: currentPeriodEnd,
        is_annual: isAnnual(productId),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (error) {
    // Log and return 500 so RevenueCat retries the event.
    console.error('subscriptions upsert failed:', error.message);
    return jsonResponse({ error: error.message }, 500);
  }

  return jsonResponse({ received: true }, 200);
});
