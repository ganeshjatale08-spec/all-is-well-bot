import { Text, View } from 'react-native';

type StatProps = {
  value: string | number;
  unit?: string;
  label: string;
};

/** FRONTEND_DESIGN §5 — number+unit+label; tabular figures so updates don't jitter. */
export function Stat({ value, unit, label }: StatProps) {
  return (
    <View className="gap-0.5" accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}>
      <View className="flex-row items-baseline gap-1">
        <Text className="font-display text-2xl text-ink" style={{ fontVariant: ['tabular-nums'] }}>
          {value}
        </Text>
        {unit ? <Text className="font-body-medium text-sm text-ink-muted">{unit}</Text> : null}
      </View>
      <Text className="font-body-medium text-xs text-ink-muted">{label}</Text>
    </View>
  );
}
