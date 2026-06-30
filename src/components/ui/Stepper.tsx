import { Minus, Plus } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '../../lib/theme';

type StepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
};

/** FRONTEND_DESIGN §5 — decrement/increment control, ≥44pt targets. */
export function Stepper({ label, value, onChange, min = 0, max = Infinity, step = 1, unit }: StepperProps) {
  const { tokens } = useTheme();
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <View className="gap-1.5">
      <Text className="font-body-medium text-sm text-ink-muted">{label}</Text>
      <View className="flex-row items-center gap-4">
        <Pressable
          onPress={() => onChange(Math.max(min, value - step))}
          disabled={atMin}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          accessibilityState={{ disabled: atMin }}
          className={`h-11 w-11 items-center justify-center rounded-full border border-hairline bg-surface ${
            atMin ? 'opacity-50' : ''
          }`}
        >
          <Minus size={18} color={tokens.ink} strokeWidth={2} />
        </Pressable>
        <Text
          className="min-w-[48px] text-center font-display text-xl text-ink"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {value}
          {unit ? ` ${unit}` : ''}
        </Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + step))}
          disabled={atMax}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          accessibilityState={{ disabled: atMax }}
          className={`h-11 w-11 items-center justify-center rounded-full border border-hairline bg-surface ${
            atMax ? 'opacity-50' : ''
          }`}
        >
          <Plus size={18} color={tokens.ink} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
  );
}
