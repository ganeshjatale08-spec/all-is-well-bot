import { X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../../../lib/theme';

type LogSheetHeaderProps = {
  title: string;
  onClose: () => void;
};

/** Shared header for the log/* modal sheets — title + close (APP_FLOW §1). */
export function LogSheetHeader({ title, onClose }: LogSheetHeaderProps) {
  const { tokens } = useTheme();

  return (
    <View className="mb-2 flex-row items-center justify-between">
      <Text className="font-display text-xl text-ink">{title}</Text>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
        className="h-11 w-11 items-center justify-center rounded-full active:bg-surface-sunken"
      >
        <X size={22} color={tokens.ink} strokeWidth={2} />
      </Pressable>
    </View>
  );
}
