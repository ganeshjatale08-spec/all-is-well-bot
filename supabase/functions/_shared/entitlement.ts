// HARD RULE 3: Free tier triggers zero Gemini calls — gate every Edge
// Function on a Pro+ entitlement, server-side, before any model call.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

const PRO_PLUS_PLANS = new Set(['pro', 'family', 'advanced']);
const ENTITLED_STATUSES = new Set(['active', 'trialing', 'grace']);

// No subscriptions row = never subscribed = free. Phase 6 (RevenueCat) is
// what actually populates this table; until then every user reads as free,
// which is the correct fail-closed default for an AI cost gate.
export async function hasProEntitlement(
  client: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return false;

  return PRO_PLUS_PLANS.has(data.plan) && ENTITLED_STATUSES.has(data.status);
}
