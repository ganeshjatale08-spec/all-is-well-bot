import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

import { useTheme } from '../../lib/theme';

export function OfflineBanner() {
  const { tokens } = useTheme();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    return unsub;
  }, []);

  if (!isOffline) return null;

  return (
    <View
      style={{
        backgroundColor: tokens.warn,
        paddingHorizontal: 16,
        paddingVertical: 8,
      }}
      accessibilityRole="alert"
      accessibilityLabel="You are offline. Logs save and sync when you reconnect."
    >
      <Text
        style={{
          fontFamily: 'PlusJakartaSans_500Medium',
          fontSize: 13,
          color: '#1A1A1A',
          textAlign: 'center',
        }}
      >
        You&apos;re offline — logs will sync when you reconnect.
      </Text>
    </View>
  );
}
