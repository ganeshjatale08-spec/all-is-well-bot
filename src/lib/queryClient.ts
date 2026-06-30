import { QueryClient } from '@tanstack/react-query';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Logging is offline-first and never blocks on network (TRD §7) — queries
// retry quietly in the background instead of surfacing transient errors.
// gcTime is extended well past the library default (5 min) so cache entries
// — including paused, not-yet-synced mutations — survive being written to
// and restored from AsyncStorage across app restarts while offline.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60 * 1000,
      gcTime: ONE_DAY_MS,
    },
    mutations: {
      retry: 2,
      gcTime: ONE_DAY_MS,
    },
  },
});
