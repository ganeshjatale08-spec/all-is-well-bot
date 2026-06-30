import { QueryClient } from '@tanstack/react-query';

// Logging is offline-first and never blocks on network (TRD §7) — queries
// retry quietly in the background instead of surfacing transient errors.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60 * 1000,
    },
    mutations: {
      retry: 2,
    },
  },
});
