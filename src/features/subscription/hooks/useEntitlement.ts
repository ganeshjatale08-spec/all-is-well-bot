import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Purchases, { type CustomerInfo } from 'react-native-purchases';

import { supabase } from '../../../lib/supabase';
import { getCustomerInfoSafe, rcIsProActive } from '../../../lib/revenuecat';
import { useSession } from '../../auth/SessionProvider';

const PRO_PLUS_PLANS = new Set(['pro', 'family', 'advanced']);
const ENTITLED_STATUSES = new Set(['active', 'trialing', 'grace']);

export function entitlementQueryKey(userId: string | undefined) {
  return ['entitlement', userId] as const;
}

// Derives isProPlus from two sources in priority order:
//   1. RevenueCat local CustomerInfo — authoritative for the client after a
//      purchase (instantly available, no webhook round-trip needed).
//   2. Supabase subscriptions row — written by the revenuecat-webhook Edge
//      Function; the authoritative source for server-side Edge Function gates
//      (hasProEntitlement in _shared/entitlement.ts reads the same row).
// If either source says Pro+ → user is entitled. Edge Functions always gate
// on the DB row independently (HARD RULE 3), so a missed webhook only affects
// the client UI gate, not the AI cost gate.
export function useEntitlement() {
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  // Subscribe to RevenueCat CustomerInfo update events so the UI unlocks
  // immediately after a purchase completes, without waiting for the webhook
  // to write the subscriptions row.
  useEffect(() => {
    function handleUpdate(info: CustomerInfo) {
      queryClient.setQueryData(entitlementQueryKey(userId), {
        isProPlus: rcIsProActive(info),
      });
    }
    Purchases.addCustomerInfoUpdateListener(handleUpdate);
    return () => {
      Purchases.removeCustomerInfoUpdateListener(handleUpdate);
    };
  }, [userId, queryClient]);

  return useQuery({
    queryKey: entitlementQueryKey(userId),
    queryFn: async (): Promise<{ isProPlus: boolean }> => {
      // Check RevenueCat first — if RC says pro, no need to hit the DB.
      const rcInfo = await getCustomerInfoSafe();
      if (rcInfo && rcIsProActive(rcInfo)) {
        return { isProPlus: true };
      }

      // Fall back to the Supabase subscriptions row (set by webhook).
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { isProPlus: false };
      return {
        isProPlus: PRO_PLUS_PLANS.has(data.plan) && ENTITLED_STATUSES.has(data.status),
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
