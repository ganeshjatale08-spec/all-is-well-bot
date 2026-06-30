import { Switch, Text, View } from 'react-native';

import { useTheme } from '../../lib/theme';

type ToggleProps = {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  description?: string;
};

/** FRONTEND_DESIGN §5 — labeled row wrapping the native Switch. */
export function Toggle({ label, value, onChange, description }: ToggleProps) {
  const { tokens } = useTheme();

  return (
    <View className="flex-row items-center justify-between gap-3 py-1">
      <View className="flex-1 gap-0.5">
        <Text className="font-body-medium text-base text-ink">{label}</Text>
        {description ? <Text className="font-body text-sm text-ink-muted">{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ false: tokens.hairline, true: tokens.primary }}
        thumbColor={tokens.surface}
      />
    </View>
  );
}
