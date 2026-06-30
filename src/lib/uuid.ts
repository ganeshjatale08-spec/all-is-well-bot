import 'react-native-get-random-values';

// RFC 4122 v4 UUID using the polyfilled crypto.getRandomValues (already
// loaded for Supabase's secure storage) — avoids adding a uuid dependency
// just for client-side temp IDs on optimistic journal entries.
export function generateLocalId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
