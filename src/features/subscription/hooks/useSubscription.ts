import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

import { entitlementQueryKey } from './useEntitlement';
import { useSession } from '../../auth/SessionProvider';
import { rcIsProActive } from '../../../lib/revenuecat';

export function useOfferings() {
  return useQuery({
    queryKey: ['offerings'],
    queryFn: async () => {
      const offerings = await Purchases.getOfferings();
      return offerings;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function usePurchasePackage() {
  const { session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pkg: PurchasesPackage) => {
      const result = await Purchases.purchasePackage(pkg);
      return result;
    },
    onSuccess: (result) => {
      // Optimistically unlock UI before webhook round-trip.
      if (rcIsProActive(result.customerInfo)) {
        queryClient.setQueryData(entitlementQueryKey(session?.user.id), { isProPlus: true });
      }
    },
  });
}

export function useRestorePurchases() {
  const { session } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const customerInfo = await Purchases.restorePurchases();
      return customerInfo;
    },
    onSuccess: (customerInfo) => {
      queryClient.setQueryData(entitlementQueryKey(session?.user.id), {
        isProPlus: rcIsProActive(customerInfo),
      });
      // Also invalidate to re-read from DB once webhook has had time to land.
      queryClient.invalidateQueries({ queryKey: entitlementQueryKey(session?.user.id) });
    },
  });
}
