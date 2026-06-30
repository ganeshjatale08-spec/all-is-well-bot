import { Pressable, Text, View } from 'react-native';

import type { TrendRange } from '../hooks/useTrends';

const OPTIONS: { value: TrendRange; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: '3month', label: '3 Months' },
];

type RangePickerProps = {
  value: TrendRange;
  onChange: (range: TrendRange) => void;
};

/** FRONTEND_DESIGN §7 — segmented Pill group for the trend-range toggle. */
export function RangePicker({ value, onChange }: RangePickerProps) {
  return (
    <View
      className="flex-row rounded-md bg-surface-sunken p-1"
      accessibilityRole="tablist"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`flex-1 items-center rounded py-2 ${active ? 'bg-surface' : ''}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
          >
            <Text
              className={`font-body-medium text-xs ${active ? 'text-ink' : 'text-ink-muted'}`}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
