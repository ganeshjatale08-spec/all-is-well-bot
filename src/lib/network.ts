import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

// React Native has no `navigator.onLine`/window events, so TanStack Query's
// default onlineManager always reports "online" here unless we wire a real
// signal — without this, mutations made offline fail immediately instead of
// pausing for retry-on-reconnect (TRD §7).
export function setupNetworkListener(): () => void {
  let unsubscribe: (() => void) | undefined;
  onlineManager.setEventListener((setOnline) => {
    unsubscribe = NetInfo.addEventListener((state) => {
      setOnline(!!state.isConnected && state.isInternetReachable !== false);
    });
    return unsubscribe;
  });
  return () => unsubscribe?.();
}
