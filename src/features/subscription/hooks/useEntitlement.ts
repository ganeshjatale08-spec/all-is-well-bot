import { useQuery } from '@tanstack/react-query';

import { supabase } from '../../../lib/supabase';
import { useSession } from '../../auth/SessionProvider';

// Reads the `subscriptions` row pulled forward in Phase 4 (BACKEND_SCHEMA
// §7) so Pro-gated UI (the AI insight card) can react to entitlement now.
// This is intentionally minimal — full RevenueCat wiring (lib/revenuecat.ts,
// purchase flow, webhook writes) is Phase 6; until then no row exists for
// any user and everyone correctly reads as free, matching the server-side
// default in supabase/functions/_shared/entitlement.ts.
const PRO_PLUS_PLANS = new Set(['pro', 'family', 'advanced']);
const ENTITLED_STATUSES = new Set(['active', 'trialing', 'grace']);

export function entitlementQueryKey(userId: string | undefined) {
  return ['entitlement', userId] as const;
}

export function useEntitlement() {
  const { session } = useSession();
  const userId = session?.user.id;

  return useQuery({
    queryKey: entitlementQueryKey(userId),
    queryFn: async (): Promise<{ isProPlus: boolean }> => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { isProPlus: false };
      return { isProPlus: PRO_PLUS_PLANS.has(data.plan) && ENTITLED_STATUSES.has(data.status) };
    },
    enabled: !!userId,
  });
}
