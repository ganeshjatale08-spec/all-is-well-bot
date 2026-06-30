import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { useToastStore } from '../../lib/toast';

const TOAST_DURATION_MS = 2500;

const containerByVariant = {
  default: 'bg-ink',
  success: 'bg-primary',
  error: 'bg-danger',
} as const;

/** FRONTEND_DESIGN §5 — bottom banner; mount once near app root. */
export function Toast() {
  const { message, variant, hide } = useToastStore();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(hide, TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [message, hide]);

  if (!message) return null;

  return (
    <View className="absolute inset-x-4 bottom-8 items-center" pointerEvents="none">
      <View
        className={`rounded-md px-4 py-3 ${containerByVariant[variant]}`}
        accessibilityLiveRegion="polite"
      >
        <Text className="font-body-medium text-sm text-surface">{message}</Text>
      </View>
    </View>
  );
}
