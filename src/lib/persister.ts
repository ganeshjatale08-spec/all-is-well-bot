import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

// Persists the query cache (including paused, not-yet-synced mutations) to
// device storage so offline journal writes survive an app restart and
// resume syncing once back online (TRD §7).
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'saathi-query-cache',
});
